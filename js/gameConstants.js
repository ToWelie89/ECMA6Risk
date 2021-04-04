const { worldMap } = require('./map/maps/classicMap/worldMapConfiguration');
const { worldMapExtended } = require('./map/maps/worldMapExtended/worldMapExtendedConfiguration');
const { napoleonicEuropeMap } = require('./map/maps/napoleonicEurope/napoleonicEuropeConfiguration');
const { CARD_TYPE } = require('./card/cardConstants');

const TURN_PHASES = {
    DEPLOYMENT: 0,
    ATTACK: 1,
    MOVEMENT: 2
};

const PAUSE_MODES = {
    NOT_PAUSED: 0,
    PAUSING: 1,
    PAUSED: 2
};

const GAME_PHASES = {
    MAIN_MENU: 0,
    SETTINGS: 1,
    PLAYER_SETUP: 2,
    GAME: 3,
    AI_TESTING: 4,
    TUTORIAL: 5,
    END_SCREEN: 6,
    CHARACTER_CREATOR: 7,
    PLAYER_SETUP_MULTIPLAYER: 8,
    MULTIPLAYER_LOBBIES: 9,
    GAME_MULTIPLAYER: 10,
    EDIT_PROFILE: 11,
    PROFILE: 12,
    LEADERBOARD: 13,
    PLAYER_SETUP_NAPOLEONIC: 14,
    PLAYER_SETUP_LOTR: 15,
    CHARACTER_GALLERY: 16,
    PATCH_LOG: 17
};

const MAPS = [
    {
        id: 'WORLD_MAP',
        mainMap: './assets/maps/worldMap/worldMap.svg',
        configuration: worldMap,
        name: 'Classic world map',
        regions: worldMap.regions.length,
        territories: worldMap.regions.reduce((accumulator, currentValue) => accumulator.concat(currentValue.territories), []).length,
        description: 'The classic world map configuration'
    }, {
        id: 'WORLD_MAP_EXTENDED',
        mainMap: './assets/maps/worldMapExtended/worldMapExtended.svg',
        configuration: worldMapExtended,
        name: 'Extended world map',
        regions: worldMapExtended.regions.length,
        territories: worldMapExtended.regions.reduce((accumulator, currentValue) => accumulator.concat(currentValue.territories), []).length,
        description: 'An extended version of the classic world map configuration with additional territories and paths between regions'
    }, {
        id: 'NAPOLEONIC_EUROPE_MAP',
        mainMap: './assets/maps/napoleonicEurope/napoleonMap.svg',
        configuration: napoleonicEuropeMap,
        name: 'Napoleonic Era Europe',
        regions: napoleonicEuropeMap.regions.length,
        territories: napoleonicEuropeMap.regions.reduce((accumulator, currentValue) => accumulator.concat(currentValue.territories), []).length,
        description: 'This is map of Europe based on the the era of the Napoleonic wars.'
    }
];

const CONSTANTS = {
    MIN_NUMBER_OF_PLAYERS: 2,
    MAX_NUMBER_OF_PLAYERS: 6,
    MIN_REINFORCEMENTS: 3
};

const TURN_LENGTHS = [
    30,
    60,
    90,
    120, // 2 min
    150, // 2,5 min
    180, // 3 min
    360, // 6 min
    600, // 10 min
    900 // 15 min
];

const VICTORY_GOALS = [
    {
        type: 'mapControl',
        percentage: 80,
        requiredAmountOfPlayers: 2
    },
    {
        type: 'mapControl',
        percentage: 90,
        requiredAmountOfPlayers: 2
    },
    {
        type: 'mapControl',
        percentage: 100,
        requiredAmountOfPlayers: 2
    },
];

const POSSIBLE_CARD_COMBINATIONS = [
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.HORSE, CARD_TYPE.CANNON], value: 10},
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.HORSE, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.CANNON, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.JOKER, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.HORSE, CARD_TYPE.JOKER, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.CANNON, CARD_TYPE.JOKER, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.CANNON, CARD_TYPE.HORSE, CARD_TYPE.JOKER], value: 10},
    {combination: [CARD_TYPE.CANNON, CARD_TYPE.CANNON, CARD_TYPE.CANNON], value: 7},
    {combination: [CARD_TYPE.CANNON, CARD_TYPE.CANNON, CARD_TYPE.JOKER], value: 7},
    {combination: [CARD_TYPE.HORSE, CARD_TYPE.HORSE, CARD_TYPE.HORSE], value: 5},
    {combination: [CARD_TYPE.HORSE, CARD_TYPE.HORSE, CARD_TYPE.JOKER], value: 5},
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.TROOP, CARD_TYPE.TROOP], value: 3},
    {combination: [CARD_TYPE.TROOP, CARD_TYPE.TROOP, CARD_TYPE.JOKER], value: 3}
];

const MAIN_MUSIC = './audio/bgmusic3.mp3';

const AI_MUSIC = './audio/bgmusic2.mp3';

const ATTACK_MUSIC = './audio/attackMusic.mp3';

const IN_GAME_MUSIC = './audio/ingameMusic.mp3';

const VICTORY_MUSIC = './audio/victory.mp3';

const MUSIC_VOLUME_DURING_TUTORIAL = 10;

const MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING = 30;

const MAX_CARDS_ON_HAND = 5;

module.exports = {
    TURN_PHASES,
    GAME_PHASES,
    CONSTANTS,
    MAIN_MUSIC,
    AI_MUSIC,
    ATTACK_MUSIC,
    VICTORY_MUSIC,
    IN_GAME_MUSIC,
    MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING,
    MAX_CARDS_ON_HAND,
    MUSIC_VOLUME_DURING_TUTORIAL,
    VICTORY_GOALS,
    POSSIBLE_CARD_COMBINATIONS,
    PAUSE_MODES,
    MAPS,
    TURN_LENGTHS
};
