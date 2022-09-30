import { Base } from '@studiometa/js-toolkit';
import { intervalPromise } from '../utils/intervalPromise';
import gsap from 'gsap';
import { removeClass } from '@studiometa/js-toolkit/utils';

export default class Preloader extends Base {
    static config = {
        name: 'Preloader',
        refs: ['wrapper', 'logoFrames[]', 'name', 'scribblePath', 'nameWord', 'overlay'],
        options: {
            name: {
                type: String,
                default: 'cassandre',
            },
        },
    };

    mounted () {
        this.logoFramesAnimation = null;
        this.overlay = {
            context: this.$refs.overlay.getContext('2d'),
            width: window.innerWidth * window.devicePixelRatio,
            height: window.innerHeight * window.devicePixelRatio,
        };
        this.$refs.overlay.width = this.overlay.width;
        this.$refs.overlay.height = this.overlay.height;
    }

    async animateIn () {
        return new Promise(resolve => {
            gsap.timeline({
                onStart: () => {
                    removeClass(this.$el, 'is-hidden');
                    gsap.set(this.$refs.logoFrames, { autoAlpha: 0 });
                    const scribblePathLength = this.$refs.scribblePath.getTotalLength();
                    gsap.set(this.$refs.scribblePath, { strokeDasharray: `${scribblePathLength} ${scribblePathLength}` });
                },
            })
                .to(this.$refs.logoFrames, {
                    keyframes: [{ autoAlpha: 0, duration: 0 }, {
                        autoAlpha: 1,
                        duration: 0,
                        delay: 0.05,
                    }, { autoAlpha: 0, duration: 0, delay: 0.05 }],
                    stagger: 0.05,
                    delay: 1,
                })
                .add(this.animateLogoFrames())
                .set(this.$refs.name, { autoAlpha: 1 })
                .to(this.$refs.nameWord, {
                    duration: 0.3,
                    ease: `step(${this.$options.name.length})`,
                    onUpdate: function(nameTarget, nameString) {
                        nameTarget.innerText = nameString.slice(0, Math.round(this.progress() * nameString.length));
                    },
                    onUpdateParams: [this.$refs.nameWord, this.$options.name],
                })
                .to(this.$refs.nameWord, {
                    delay: 0.5,
                    duration: 0.14,
                    ease: `step(${this.$options.name.length})`,
                    onUpdate: function(nameTarget, nameString) {
                        nameTarget.innerText = nameString.slice(0, Math.round((1 -this.progress()) * nameString.length));
                    },
                    onUpdateParams: [this.$refs.nameWord, this.$options.name],
                })
                .fromTo(this.$refs.scribblePath, {
                    strokeDashoffset: this.$refs.scribblePath.getTotalLength(),
                }, {
                    strokeDashoffset: -this.$refs.scribblePath.getTotalLength() + 1,
                    duration: 1,
                    ease: 'quart.out',
                }, '>+=0.1')
                .set(this.$refs.overlay, { autoAlpha: 1 })
                .call(resolve, [], '>-=0.7');
        });
    }

    async animateOut () {
        return new Promise(resolve => {
            gsap.timeline({
                onComplete: () => {
                    gsap.set(this.$el, { autoAlpha: 0 });
                    resolve();
                },
            })
                .add(gsap.to(this.overlay, {
                    duration: 0.7,
                    ease: 'quint.in',
                    onUpdate: this.animateOverlay,
                    onUpdateParams: [this.overlay, this.overlay.height, '#FF6C3C'],
                }))
                .add(gsap.to(this.overlay, {
                    onStart: () => {
                        gsap.set(this.$refs.wrapper, { autoAlpha: 0 });
                    },
                    onComplete: () => {
                        gsap.set(this.$refs.wrapper, { autoAlpha: 1 });
                    },
                    duration: 1,
                    ease: 'expo.out',
                    onUpdate: this.animateOverlay,
                    onUpdateParams: [this.overlay, 0, '#FF6C3C'],
                }));
        });
    }

    async animatePageTransitionIn () {
        return new Promise(resolve => {
            gsap.timeline({
                onStart: () => {
                    gsap.set(this.$refs.name, { autoAlpha: 0 });
                    this.logoFramesAnimation = this.animateLogoFrames().repeat(-1);
                },
                onComplete: resolve,
            })
                .to(this.$el, {
                    autoAlpha: 1,
                    duration: 0.1,
                });
        });
    }

    async animatePageTransitionOut () {
        return new Promise(resolve => {
            gsap.timeline({
                onStart: () => {
                    this.logoFramesAnimation.pause();
                    gsap.set(this.$refs.logoFrames, { autoAlpha: 0 });
                },
                onComplete: () => {
                    this.logoFramesAnimation.kill();
                    resolve();
                },
            })
                .to(this.$el, {
                    autoAlpha: 0,
                    duration: 0.3,
                    onComplete: resolve,
                });
        });
    }

    animateLogoFrames () {
        if (this.logoFramesAnimation) this.logoFramesAnimation.kill();
        return gsap.to(this.$refs.logoFrames, {
            onStart: () => {
                gsap.set(this.$refs.logoFrames, { autoAlpha: 0 });
            },
            keyframes: [{ autoAlpha: 0, duration: 0 }, { autoAlpha: 1, duration: 0, delay: 0.05, }, { autoAlpha: 0, duration: 0, delay: 0.05 }],
            stagger: 0.05,
        });
    }

    animateOverlay (overlay, baseY, fillColor) {
        overlay.context.clearRect(0, 0, overlay.width, overlay.height);
        overlay.context.save();
        overlay.context.beginPath();

        overlay.context.moveTo(overlay.width, baseY);
        overlay.context.lineTo(0, baseY);

        const widthSegments = Math.ceil(overlay.width / 40);
        const t = (1 - this.ratio) * overlay.height;
        const amplitude = 200 * Math.sin(this.ratio * Math.PI);

        overlay.context.lineTo(0, t);

        for (let index = 0; index <= widthSegments; index++) {
            const n = 40 * index;
            const r = t - Math.sin((n / overlay.width) * Math.PI) * amplitude;

            overlay.context.lineTo(n, r);
        }

        overlay.context.fillStyle = fillColor;
        overlay.context.fill();
        overlay.context.restore();
    }
}
