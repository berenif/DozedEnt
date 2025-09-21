import {decrypt, encrypt, genKey, sha1} from './crypto.js'
import initPeer from '../netcode/peer.js'
import room from '../netcode/room.js'
import {
  all,
  alloc,
  fromJson,
  libName,
  mkErr,
  noOp,
  selfId,
  toJson,
  topicPath
} from './utils.js'
import {
  OFFER_POOL_SIZE,
  ANNOUNCE_INTERVAL_MS,
  OFFER_TTL_MS
} from './constants.js'
import {normalizeConfig} from './config.js'

const poolSize = OFFER_POOL_SIZE
const announceIntervalMs = ANNOUNCE_INTERVAL_MS
const offerTtl = OFFER_TTL_MS

export default ({init, subscribe, announce}) => {
  const occupiedRooms = {}
  let activeRoomCount = 0

  let didInit = false
  let initPromises
  let offerPool
  let offerCleanupTimer

  return (config, roomId, onJoinError) => {
    const normalizedConfig = normalizeConfig(config)
    const {appId, logger} = normalizedConfig

    if (occupiedRooms[appId]?.[roomId]) {
      return occupiedRooms[appId][roomId]
    }

    const pendingOffers = {}
    const connectedPeers = {}
    const rootTopicPlaintext = topicPath(libName, appId, roomId)
    const rootTopicP = sha1(rootTopicPlaintext)
    const selfTopicP = sha1(topicPath(rootTopicPlaintext, selfId))
    const key = genKey(normalizedConfig.password || '', appId, roomId)

    const withKey = f => async signal => ({
      type: signal.type,
      sdp: await f(key, signal.sdp)
    })

    const toPlain = withKey(decrypt)
    const toCipher = withKey(encrypt)

    const makeOffer = () => initPeer(true, normalizedConfig)

    const connectPeer = (peer, peerId, relayId) => {
      if (connectedPeers[peerId]) {
        if (connectedPeers[peerId] !== peer) {
          peer.destroy()
        }
        return
      }

      connectedPeers[peerId] = peer
      onPeerConnect(peer, peerId)

      pendingOffers[peerId]?.forEach((peer, i) => {
        if (i !== relayId) {
          peer.destroy()
        }
      })
      delete pendingOffers[peerId]
    }

    const disconnectPeer = (peer, peerId) => {
      if (connectedPeers[peerId] === peer) {
        delete connectedPeers[peerId]
      }
    }

    const prunePendingOffer = (peerId, relayId) => {
      if (connectedPeers[peerId]) {
        return
      }

      const offer = pendingOffers[peerId]?.[relayId]

      if (offer) {
        delete pendingOffers[peerId][relayId]
        offer.destroy()
      }
    }

    const getOffers = n => {
      offerPool.push(...alloc(n, makeOffer))

      return all(
        offerPool
          .splice(0, n)
          .map(peer =>
            peer.offerPromise.then(toCipher).then(offer => ({peer, offer}))
          )
      )
    }

    const handleJoinError = (peerId, sdpType) =>
      onJoinError?.({
        error: `incorrect password (${normalizedConfig.password}) when decrypting ${sdpType}`,
        appId,
        peerId,
        roomId
      })

    const handleMessage = relayId => async (topic, msg, signalPeer) => {
      const [rootTopic, selfTopic] = await all([rootTopicP, selfTopicP])

      if (topic !== rootTopic && topic !== selfTopic) {
        return
      }

      const {peerId, offer, answer, peer} =
        typeof msg === 'string' ? fromJson(msg) : msg

      if (peerId === selfId || connectedPeers[peerId]) {
        return
      }

      if (peerId && !offer && !answer) {
        if (pendingOffers[peerId]?.[relayId]) {
          return
        }

        const [[{peer, offer}], topic] = await all([
          getOffers(1),
          sha1(topicPath(rootTopicPlaintext, peerId))
        ])

        pendingOffers[peerId] ||= []
        pendingOffers[peerId][relayId] = peer

        setTimeout(
          () => prunePendingOffer(peerId, relayId),
          announceIntervals[relayId] * 0.9
        )

        peer.setHandlers({
          connect: () => connectPeer(peer, peerId, relayId),
          close: () => disconnectPeer(peer, peerId)
        })

        signalPeer(topic, toJson({peerId: selfId, offer}))
      } else if (offer) {
        const myOffer = pendingOffers[peerId]?.[relayId]

        if (myOffer && selfId > peerId) {
          return
        }

        const peer = initPeer(false, normalizedConfig)
        peer.setHandlers({
          connect: () => connectPeer(peer, peerId, relayId),
          close: () => disconnectPeer(peer, peerId)
        })

        let plainOffer

        try {
          plainOffer = await toPlain(offer)
        } catch {
          handleJoinError(peerId, 'offer')
          return
        }

        if (peer.isDead) {
          return
        }

        const [topic, answer] = await all([
          sha1(topicPath(rootTopicPlaintext, peerId)),
          peer.signal(plainOffer)
        ])

        signalPeer(
          topic,
          toJson({peerId: selfId, answer: await toCipher(answer)})
        )
      } else if (answer) {
        let plainAnswer

        try {
          plainAnswer = await toPlain(answer)
        } catch (e) {
          handleJoinError(peerId, 'answer')
          return
        }

        if (peer) {
          peer.setHandlers({
            connect: () => connectPeer(peer, peerId, relayId),
            close: () => disconnectPeer(peer, peerId)
          })

          peer.signal(plainAnswer)
        } else {
          const peer = pendingOffers[peerId]?.[relayId]

          if (peer && !peer.isDead) {
            peer.signal(plainAnswer)
          }
        }
      }
    }

    if (!appId && !normalizedConfig.firebaseApp) {
      throw mkErr('config map is missing appId field')
    }

    if (!roomId) {
      throw mkErr('roomId argument required')
    }

    if (!didInit) {
      const initRes = init(config)
      offerPool = alloc(poolSize, makeOffer)
      initPromises = Array.isArray(initRes) ? initRes : [initRes]
      didInit = true
      offerCleanupTimer = setInterval(
        () =>
          (offerPool = offerPool.filter(peer => {
            const shouldLive = Date.now() - peer.created < offerTtl

            if (!shouldLive) {
              peer.destroy()
            }

            return shouldLive
          })),
        offerTtl * 1.03
      )
    }

    const announceIntervals = initPromises.map(() => announceIntervalMs)
    const announceTimeouts = []

    const unsubFns = initPromises.map(async (relayP, i) => {
      try {
        const relay = await relayP
        if (!relay) throw new Error('relay not available')

        return subscribe(
          relay,
          await rootTopicP,
          await selfTopicP,
          handleMessage(i),
          getOffers
        )
      } catch (err) {
        logger?.warn?.(`Relay #${i} failed to initialize: ${err?.message || err}`)
        return () => {}
      }
    })

    all([rootTopicP, selfTopicP]).then(([rootTopic, selfTopic]) => {
      const queueAnnounce = async (relay, i) => {
        const ms = await announce(relay, rootTopic, selfTopic)

        if (typeof ms === 'number') {
          announceIntervals[i] = ms
        }

        announceTimeouts[i] = setTimeout(
          () => queueAnnounce(relay, i),
          announceIntervals[i]
        )
      }

      unsubFns.forEach(async (didSub, i) => {
        try {
          await didSub
          const relay = await initPromises[i].catch(() => null)
          if (relay) queueAnnounce(relay, i)
        } catch {}
      })
    })

    let onPeerConnect = noOp

    occupiedRooms[appId] ||= {}
    activeRoomCount++

    return (occupiedRooms[appId][roomId] = room(
      f => (onPeerConnect = f),
      id => delete connectedPeers[id],
      () => {
        delete occupiedRooms[appId][roomId]
        announceTimeouts.forEach(clearTimeout)
        unsubFns.forEach(async f => (await f)())
        activeRoomCount--
        if (activeRoomCount <= 0) {
          if (offerCleanupTimer) {
            clearInterval(offerCleanupTimer)
            offerCleanupTimer = null
          }
          // Tear down init state so a future room can reinitialize cleanly
          offerPool?.forEach(p => p.destroy())
          offerPool = []
          initPromises = null
          didInit = false
        }
      },
      logger
    ))
  }
}
