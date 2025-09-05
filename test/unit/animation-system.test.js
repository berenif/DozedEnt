import { expect } from 'chai';
import sinon from 'sinon';
import {
  AnimationFrame,
  Animation,
  AnimationController,
  ProceduralAnimator,
  CharacterAnimator,
  AnimationPresets
} from '../../src/animation/animation-system.js';

describe('Animation System', () => {
  describe('AnimationFrame', () => {
    it('should create a frame with default duration', () => {
      const frame = new AnimationFrame(0, 0, 32, 32);
      
      expect(frame.x).to.equal(0);
      expect(frame.y).to.equal(0);
      expect(frame.width).to.equal(32);
      expect(frame.height).to.equal(32);
      expect(frame.duration).to.equal(100);
    });

    it('should create a frame with custom duration', () => {
      const frame = new AnimationFrame(10, 20, 64, 64, 200);
      
      expect(frame.x).to.equal(10);
      expect(frame.y).to.equal(20);
      expect(frame.width).to.equal(64);
      expect(frame.height).to.equal(64);
      expect(frame.duration).to.equal(200);
    });
  });

  describe('Animation', () => {
    let frames;

    beforeEach(() => {
      frames = [
        new AnimationFrame(0, 0, 32, 32, 100),
        new AnimationFrame(32, 0, 32, 32, 100),
        new AnimationFrame(64, 0, 32, 32, 100)
      ];
    });

    it('should create an animation with default options', () => {
      const anim = new Animation('walk', frames);
      
      expect(anim.name).to.equal('walk');
      expect(anim.frames).to.equal(frames);
      expect(anim.loop).to.be.true;
      expect(anim.pingPong).to.be.false;
      expect(anim.speed).to.equal(1.0);
      expect(anim.currentFrame).to.equal(0);
      expect(anim.isPlaying).to.be.false;
    });

    it('should create an animation with custom options', () => {
      const onComplete = sinon.stub();
      const onFrame = sinon.stub();
      
      const anim = new Animation('jump', frames, {
        loop: false,
        pingPong: true,
        speed: 2.0,
        onComplete,
        onFrame
      });
      
      expect(anim.loop).to.be.false;
      expect(anim.pingPong).to.be.true;
      expect(anim.speed).to.equal(2.0);
      expect(anim.onComplete).to.equal(onComplete);
      expect(anim.onFrame).to.equal(onFrame);
    });

    describe('playback controls', () => {
      let anim;

      beforeEach(() => {
        anim = new Animation('test', frames);
      });

      it('should start playing when play() is called', () => {
        anim.play();
        
        expect(anim.isPlaying).to.be.true;
        expect(anim.hasCompleted).to.be.false;
        expect(anim.currentFrame).to.equal(0);
        expect(anim.elapsedTime).to.equal(0);
        expect(anim.direction).to.equal(1);
      });

      it('should stop playing when stop() is called', () => {
        anim.play();
        anim.stop();
        
        expect(anim.isPlaying).to.be.false;
      });

      it('should pause when pause() is called', () => {
        anim.play();
        anim.pause();
        
        expect(anim.isPlaying).to.be.false;
      });

      it('should resume when resume() is called', () => {
        anim.play();
        anim.pause();
        anim.resume();
        
        expect(anim.isPlaying).to.be.true;
      });

      it('should reset animation state', () => {
        anim.play();
        anim.currentFrame = 2;
        anim.elapsedTime = 500;
        anim.reset();
        
        expect(anim.currentFrame).to.equal(0);
        expect(anim.elapsedTime).to.equal(0);
        expect(anim.direction).to.equal(1);
        expect(anim.hasCompleted).to.be.false;
      });
    });

    describe('frame updates', () => {
      let anim;

      beforeEach(() => {
        anim = new Animation('test', frames);
      });

      it('should update frame based on elapsed time', () => {
        anim.play();
        anim.update(50);
        
        expect(anim.elapsedTime).to.equal(50);
        expect(anim.currentFrame).to.equal(0);
        
        anim.update(60); // Total: 110ms, should advance to frame 1
        expect(anim.currentFrame).to.equal(1);
      });

      it('should respect speed multiplier', () => {
        anim.speed = 2.0;
        anim.play();
        anim.update(60); // With 2x speed, effectively 120ms
        
        expect(anim.currentFrame).to.equal(1);
      });

      it('should loop when enabled', () => {
        anim.loop = true;
        anim.play();
        anim.currentFrame = 2;
        anim.elapsedTime = 90;
        
        anim.update(20); // Should wrap to frame 0
        expect(anim.currentFrame).to.equal(0);
      });

      it('should stop at last frame when loop is disabled', () => {
        anim.loop = false;
        anim.play();
        anim.currentFrame = 2;
        anim.elapsedTime = 90;
        
        anim.update(20);
        expect(anim.currentFrame).to.equal(2);
        expect(anim.hasCompleted).to.be.true;
      });

      it('should ping-pong when enabled', () => {
        anim.pingPong = true;
        anim.play();
        anim.currentFrame = 2;
        anim.elapsedTime = 90;
        
        anim.update(20); // Should reverse direction
        expect(anim.direction).to.equal(-1);
        expect(anim.currentFrame).to.equal(1);
      });
    });

    describe('frame getters', () => {
      let anim;

      beforeEach(() => {
        anim = new Animation('test', frames);
      });

      it('should get current frame', () => {
        const frame = anim.getCurrentFrame();
        expect(frame).to.equal(frames[0]);
        
        anim.currentFrame = 1;
        const frame2 = anim.getCurrentFrame();
        expect(frame2).to.equal(frames[1]);
      });

      it('should return null for invalid frame index', () => {
        anim.currentFrame = -1;
        expect(anim.getCurrentFrame()).to.be.null;
        
        anim.currentFrame = 10;
        expect(anim.getCurrentFrame()).to.be.null;
      });

      it('should get frame at specific index', () => {
        expect(anim.getFrameAt(0)).to.equal(frames[0]);
        expect(anim.getFrameAt(1)).to.equal(frames[1]);
        expect(anim.getFrameAt(2)).to.equal(frames[2]);
        expect(anim.getFrameAt(3)).to.be.null;
        expect(anim.getFrameAt(-1)).to.be.null;
      });
    });
  });

  describe('AnimationController', () => {
    let controller;
    let animations;

    beforeEach(() => {
      const frames1 = [
        new AnimationFrame(0, 0, 32, 32),
        new AnimationFrame(32, 0, 32, 32)
      ];
      const frames2 = [
        new AnimationFrame(0, 32, 32, 32),
        new AnimationFrame(32, 32, 32, 32)
      ];
      
      animations = {
        idle: new Animation('idle', frames1),
        walk: new Animation('walk', frames2)
      };
      
      controller = new AnimationController();
    });

    it('should add animations', () => {
      controller.addAnimation('idle', animations.idle);
      controller.addAnimation('walk', animations.walk);
      
      expect(controller.animations.idle).to.equal(animations.idle);
      expect(controller.animations.walk).to.equal(animations.walk);
    });

    it('should play animation by name', () => {
      controller.addAnimation('idle', animations.idle);
      controller.play('idle');
      
      expect(controller.currentAnimation).to.equal(animations.idle);
      expect(animations.idle.isPlaying).to.be.true;
    });

    it('should handle transition options', () => {
      controller.addAnimation('idle', animations.idle);
      controller.addAnimation('walk', animations.walk);
      
      controller.play('idle');
      controller.play('walk', { transition: true, transitionDuration: 200 });
      
      expect(controller.isTransitioning).to.be.true;
      expect(controller.transitionDuration).to.equal(200);
    });

    it('should stop current animation', () => {
      controller.addAnimation('idle', animations.idle);
      controller.play('idle');
      controller.stop();
      
      expect(controller.currentAnimation).to.be.null;
      expect(animations.idle.isPlaying).to.be.false;
    });

    it('should update animations', () => {
      controller.addAnimation('idle', animations.idle);
      controller.play('idle');
      
      const spy = sinon.spy(animations.idle, 'update');
      controller.update(16);
      
      expect(spy.calledWith(16)).to.be.true;
    });

    it('should get current frame', () => {
      controller.addAnimation('idle', animations.idle);
      controller.play('idle');
      
      const frame = controller.getCurrentFrame();
      expect(frame).to.equal(animations.idle.getCurrentFrame());
    });
  });

  describe('CharacterAnimator', () => {
    let animator;

    beforeEach(() => {
      animator = new CharacterAnimator();
    });

    it('should create a character animator', () => {
      expect(animator).to.be.instanceOf(CharacterAnimator);
      expect(animator.animations).to.be.an('object');
      expect(animator.currentAnimation).to.be.null;
    });

    it('should add animations', () => {
      const frames = [
        new AnimationFrame(0, 0, 32, 32),
        new AnimationFrame(32, 0, 32, 32)
      ];
      const anim = new Animation('walk', frames);
      
      animator.addAnimation('walk', anim);
      expect(animator.animations.walk).to.equal(anim);
    });

    it('should play animations', () => {
      const frames = [
        new AnimationFrame(0, 0, 32, 32),
        new AnimationFrame(32, 0, 32, 32)
      ];
      const anim = new Animation('walk', frames);
      
      animator.addAnimation('walk', anim);
      animator.play('walk');
      
      expect(animator.currentAnimation).to.equal(anim);
      expect(anim.isPlaying).to.be.true;
    });
  });

  describe('ProceduralAnimator', () => {
    let animator;

    beforeEach(() => {
      animator = new ProceduralAnimator();
    });

    it('should create a procedural animator', () => {
      expect(animator).to.be.instanceOf(ProceduralAnimator);
      expect(animator.animations).to.be.an('object');
    });

    it('should add procedural animations', () => {
      const updateFunc = sinon.stub();
      animator.addAnimation('bounce', updateFunc, { duration: 1000 });
      
      expect(animator.animations.bounce).to.exist;
      expect(animator.animations.bounce.update).to.equal(updateFunc);
      expect(animator.animations.bounce.duration).to.equal(1000);
    });

    it('should update animations', () => {
      const updateFunc = sinon.stub();
      animator.addAnimation('bounce', updateFunc, { duration: 1000 });
      animator.play('bounce');
      
      animator.update(16);
      expect(updateFunc.called).to.be.true;
    });
  });

  describe('AnimationPresets', () => {
    it('should have predefined animation configurations', () => {
      expect(AnimationPresets).to.be.an('object');
      expect(AnimationPresets).to.have.property('playerWalk');
      expect(AnimationPresets).to.have.property('playerRun');
      expect(AnimationPresets).to.have.property('playerJump');
      expect(AnimationPresets).to.have.property('wolfWalk');
      expect(AnimationPresets).to.have.property('wolfRun');
      expect(AnimationPresets).to.have.property('wolfAttack');
    });

    it('should have valid preset configurations', () => {
      const walkPreset = AnimationPresets.playerWalk;
      expect(walkPreset).to.have.property('frameCount');
      expect(walkPreset).to.have.property('frameDuration');
      expect(walkPreset).to.have.property('loop');
      expect(walkPreset.frameCount).to.be.a('number');
      expect(walkPreset.frameDuration).to.be.a('number');
      expect(walkPreset.loop).to.be.a('boolean');
    });
  });
});