// HandProtocol.js
// Message schemas, encoding/decoding, and client prediction hooks

import { timeMsToFrame } from './Quantization.js'

export const MsgType = Object.freeze({
  HandButtonDown: 'HandButtonDown',
  HandButtonUp: 'HandButtonUp',
  HandSwipe: 'HandSwipe',
  HandHoldStart: 'HandHoldStart',
  HandHoldCancel: 'HandHoldCancel',
  HandGrabRequest: 'HandGrabRequest',
  HandGrabRelease: 'HandGrabRelease',
  HandGesturePath: 'HandGesturePath',
  TwoHandBlockStart: 'TwoHandBlockStart',
  TwoHandBlockEnd: 'TwoHandBlockEnd',
  Throw: 'Throw'
})

export class HandProtocol {
  constructor({ send }) {
    this.send = send || (() => {})
  }

  // Encoding helpers
  btnDown(handId, tsMs) { this._send({ t: MsgType.HandButtonDown, handId, frame: timeMsToFrame(tsMs) }) }
  btnUp(handId, tsMs) { this._send({ t: MsgType.HandButtonUp, handId, frame: timeMsToFrame(tsMs) }) }
  swipe(handId, dir8, magnitudeBucket, startTs, endTs) { this._send({ t: MsgType.HandSwipe, handId, dir8, m: magnitudeBucket, s: timeMsToFrame(startTs), e: timeMsToFrame(endTs) }) }
  holdStart(handId, tsMs) { this._send({ t: MsgType.HandHoldStart, handId, frame: timeMsToFrame(tsMs) }) }
  holdCancel(handId, tsMs) { this._send({ t: MsgType.HandHoldCancel, handId, frame: timeMsToFrame(tsMs) }) }
  grabRequest(handId, targetId, tsMs) { this._send({ t: MsgType.HandGrabRequest, handId, targetId, frame: timeMsToFrame(tsMs) }) }
  grabRelease(handId, tsMs) { this._send({ t: MsgType.HandGrabRelease, handId, frame: timeMsToFrame(tsMs) }) }
  gesturePath(handId, points, startTs, endTs) { this._send({ t: MsgType.HandGesturePath, handId, pts: points, s: timeMsToFrame(startTs), e: timeMsToFrame(endTs) }) }
  blockStart(startTs) { this._send({ t: MsgType.TwoHandBlockStart, frame: timeMsToFrame(startTs) }) }
  blockEnd(endTs) { this._send({ t: MsgType.TwoHandBlockEnd, frame: timeMsToFrame(endTs) }) }
  throw(handId, dir8, speedBucket, tsMs) { this._send({ t: MsgType.Throw, handId, dir8, v: speedBucket, frame: timeMsToFrame(tsMs) }) }

  // Decoding is identity here (JSON messages)
  decode(msg) { return msg }

  // Prediction hooks (no-op placeholders)
  applyLocal(_command) {}
  reconcile(_serverMsg) {}

  _send(payload) { this.send(payload) }
}


