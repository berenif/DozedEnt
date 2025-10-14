import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { expect } from 'chai'

describe('Wolf balance generation', () => {
	it('emits wolf tunable macros into balance_data.h', () => {
		const hdrPath = join(process.cwd(), 'public', 'src', 'wasm', 'generated', 'balance_data.h')
		expect(existsSync(hdrPath)).to.equal(true, 'balance_data.h should exist — run npm run balance:gen')
		const hdr = readFileSync(hdrPath, 'utf8')
		expect(hdr).to.include('#define BAL_WOLF_ATTACK_ENTER_MULT')
		expect(hdr).to.include('#define BAL_WOLF_ATTACK_EXIT_MULT')
		expect(hdr).to.include('#define BAL_WOLF_APPROACH_ENTER_MULT')
		expect(hdr).to.include('#define BAL_WOLF_APPROACH_EXIT_MULT')
		expect(hdr).to.include('#define BAL_WOLF_ATTACK_FACING_COS')
		expect(hdr).to.include('#define BAL_WOLF_MAX_CONCURRENT_ATTACKERS')
		expect(hdr).to.include('#define BAL_WOLF_DAMAGE_INTERRUPT_THRESHOLD')
		// Emotion duration multipliers
		expect(hdr).to.include('#define BAL_WOLF_CONFIDENT_RECOVER_MULT')
		expect(hdr).to.include('#define BAL_WOLF_FEARFUL_STRAFE_MULT')
		expect(hdr).to.include('#define BAL_WOLF_DESPERATE_ATTACK_MULT')
	})
})
