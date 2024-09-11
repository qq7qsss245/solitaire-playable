import { Scene } from 'phaser';
import { Global } from '@/game/scenes/constants/state';
import download from './constants/download';
import { EventBus } from '../EventBus';


export class Game extends Scene {
    pipeWidth = 120;
    pipeHeight = 928;
    ballSize = 96;
    pipes: Phaser.GameObjects.Image[] = [];
    balls: Phaser.GameObjects.Image[][] = [];
    maxPerPipe = 8;
    maxStep = 5;
    step: number = 0;
    guide: Phaser.GameObjects.Image;
    started = false;
    currentGuideIndex = 5;
    popPipe: number = -1;

    constructor() {
        super('Game');
    }

    create() {
        this.add.image(490, 180, "logo");
        this.scale.on('resize', this.onResize, this);
        const ad = this.add.image(540, 1600, 'adBtn');
        this.tweens.add({
            targets: [ad],
            scale: 1.15,
            yoyo: true,
            duration: 600,
            repeat: Infinity
        });
        ad.setInteractive();
        ad.on('pointerdown', download);
        this.generatePuzzle();
    }



    onResize() {

    }




    changeScene() {
        Global.orientation = 1;
    }

    moveSameBalls(pipeIndex: number, nextPipeIndex: number) {
        const popUpBall = this.balls[pipeIndex].pop();
        const [last] = this.balls[pipeIndex].slice(-1);
        if (last?.texture === popUpBall?.texture && this.balls[nextPipeIndex].length < this.maxPerPipe - 1) {
            setTimeout(() => {
                this.moveSameBalls(pipeIndex, nextPipeIndex)
            }, 100);
        }
        if (popUpBall) {
            this.popPipe = pipeIndex;
            const pipe = this.pipes[pipeIndex];
            const nextPipe = this.pipes[nextPipeIndex];
            const pipeBalls = this.balls[nextPipeIndex];
            this.balls[nextPipeIndex].push(popUpBall);
            const targetY = nextPipe.y - (pipeBalls.length - 1) * this.ballSize - 170;
            this.tweens.add({
                targets: popUpBall,
                y: pipe.y - this.pipeHeight - 150,
                duration: 100,
                forward: true
            });
            setTimeout(() => {
                this.tweens.add({
                    targets: popUpBall,
                    x: nextPipe.x + 10,
                    duration: 120,
                    forward: true
                });
                setTimeout(() => {
                    this.tweens.add({
                        targets: popUpBall,
                        y: targetY,
                        duration: 200,
                        forward: true
                    });
                }, 100);
                if (pipeBalls.length >= this.maxPerPipe && !pipeBalls.find(b => b.texture !== pipeBalls[0].texture)) {
                    EventBus.emit('clear');
                    nextPipe.removeInteractive();
                    this.add.sprite(nextPipe.x - 60, nextPipe.y - 50, 'candle0').setOrigin(0, 1).setScale(.8, 1).setDepth(2).play('clear');
                } 
            }, 200);

        }

    }


    generatePuzzle() {
        this.anims.create({
            key: 'clear',
            frames: Array.from({ length: 30 }).map((e, index) => {
                return {
                    key: `candle${index}`,
                }
            }),
            frameRate: 15,
            repeat: 0
        });
        Global.puzzle.forEach((colors: string[], index: number) => {
            const x = 20 + index * 150, y = 500 + this.pipeHeight;
            this.balls.push([])
            colors.forEach((color, colorIndex) => {
                const ball = this.add.image(x + 10, y - colorIndex * this.ballSize - 170, color).setOrigin(0, 0);
                this.balls[index].push(ball);
            });
            const pipe = this.add.image(x, y, 'pipe').setOrigin(0, 1).setDisplaySize(this.pipeWidth, this.pipeHeight).setDepth(1);
            this.pipes.push(pipe);
            pipe.setInteractive();
            if (this.currentGuideIndex === index) {
                setTimeout(() => {
                    this.guide = this.add.image(125 + x, 75 + y / 2 + 170, 'hand').setDisplaySize(150, 150).setRotation(12).setDepth(3);
                    this.tweens.add({
                        targets: this.guide,
                        scale: 1.1,
                        duration: 400,
                        yoyo: true,
                        repeat: Infinity
                    })
                })
            }
            const handlePointDown = (pipeIndex = index) => {
                if (!this.started && this.currentGuideIndex !== pipeIndex) return;
                const pipeBalls = this.balls[pipeIndex];
                if (Global.current) {
                    if (Global.currentIndex === pipeIndex) {
                        this.balls[pipeIndex].push(Global.current);
                        this.tweens.add({
                            targets: Global.current,
                            y: pipe.y - (pipeBalls.length - 1) * this.ballSize - 170,
                            duration: 300,
                            forward: true
                        });
                        Global.current = undefined;
                    } else if (pipeBalls.length < this.maxPerPipe && (!pipeBalls.length || pipeBalls[pipeBalls.length - 1].texture === Global.current.texture)) {
                        const texture = Global.current.texture;
                        setTimeout(() => {
                            const preBalls = this.balls[this.popPipe];
                            const prevTexture = preBalls[preBalls.length - 1]?.texture;
                            if (prevTexture === texture) {
                                this.moveSameBalls(this.popPipe, index)
                            }
                        }, 10);
                        EventBus.emit('pong');
                        const targetY = pipe.y - (pipeBalls.length) * this.ballSize - 170;
                        this.balls[pipeIndex].push(Global.current);
                        this.tweens.add({
                            targets: Global.current,
                            x: pipe.x + 10,
                            duration: 150,
                            forward: true
                        });
                        setTimeout(() => {
                            this.tweens.add({
                                targets: Global.current,
                                y: targetY,
                                duration: 150,
                                forward: true
                            });
                            Global.current = undefined;
                            if (this.step >= this.maxStep) {
                                download();
                            }
                        }, 150);
                        if (pipeBalls.length >= this.maxPerPipe && !pipeBalls.find(b => b.texture !== pipeBalls[0].texture)) {
                            EventBus.emit('clear');
                            pipe.removeInteractive();
                            const sprite = this.add.sprite(x, y, 'candle0').setOrigin(0.5, 1).setDepth(2);
                            sprite.x += pipe.displayWidth/2;
                            pipeBalls.forEach(b => b.setAlpha(0));
                            pipe.alpha = 0;
                            sprite.play('clear');
                            
                        } 
                        this.step++;
                    }
                    if (!this.started) {
                        this.started = true;
                        this.guide.destroy();
                    }
                } else {
                    const popUpBall = this.balls[pipeIndex].pop();
                    this.popPipe = pipeIndex;
                    Global.current = popUpBall;
                    Global.currentIndex = pipeIndex;
                    EventBus.emit('pong');
                    this.tweens.add({
                        targets: popUpBall,
                        y: pipe.y - this.pipeHeight - 150,
                        duration: 300,
                        forward: true
                    });
                    this.currentGuideIndex = 4;
                    this.tweens.add({
                        targets: this.guide,
                        x: this.pipes[this.currentGuideIndex].x + 125,
                        duration: 300
                    });
                }
            };
            pipe.on('pointerdown', () => handlePointDown());
        });

    }
}
