const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot, Preloader, MainMenu, Game],
};

// Bind the game to a top-level identifier
const game = new Phaser.Game(config);

console.log('---main---')