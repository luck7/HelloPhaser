// Boot Scene for one-time setup that don't need assets

class Boot extends Phaser.Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        // Any tiny asset the loading screen itself needs (background,
        // logo, fonts) belongs here. Larger assets load in Preloader.
    }

    create ()
    {
        this.sound.pauseOnBlur = false;

        console.log('<---boot---')
        this.scene.start('Preloader');
        console.log('---boot--->')
    }
}
