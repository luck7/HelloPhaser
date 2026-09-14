
class MainMenu extends Phaser.Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.text(cx, cy - 40, 'Battle City', {
            font: '64px monospace',
            color: '#8bb2ff',
        }).setOrigin(0.5);

        this.add.text(cx, cy + 24, 'Click to start', {
            font: '18px monospace',
            color: '#ffe1da',
        }).setOrigin(0.5);

        this.input.once('pointerdown', () =>
        {
            this.scene.start('Game');
        });

        console.log('---mainMenu---')
    }
}
