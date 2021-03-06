/*
 * Imports
 */

const WorldMap = require('./map/worldMap');
const {worldMap} = require('./map/maps/classicMap/worldMapConfiguration');
const { getTerritoryByName, getTerritoriesByOwner, getCurrentOwnershipStandings } = require('./map/mapHelpers');
const { playerIterator, PLAYER_TYPES } = require('./player/playerConstants');
const {
    TURN_PHASES,
    MAIN_MUSIC,
    IN_GAME_MUSIC,
    AI_MUSIC,
    VICTORY_MUSIC,
    MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING,
    GAME_PHASES,
    MAPS
} = require('./gameConstants');
const { shuffle, randomIntFromInterval, randomDoubleFromInterval } = require('./helpers');
const { initiatieCardDeck } = require('./card/cardHandler');
const DeploymentHandler = require('./deployment/deploymentHandler');

class GameEngine {
    constructor(gameAnnouncerService, $rootScope, settings) {
        this.thisIsBackendGameEngine = process.env && process.env.NODE_ENV === 'web' || process.env.COMPUTERNAME || process.env.PROD;

        this.gameAnnouncerService = gameAnnouncerService;
        this.$rootScope = $rootScope;
        this.filter = 'byOwner';
        this.settings = settings;
        this.selectedTerritory = undefined;
        this.isTutorialMode = false;

        this.selectedMap = MAPS[0];

        if (!this.thisIsBackendGameEngine) {
            $(document).ready(() => {
                this.setMusic();
            });
        }
    }

    setMusicVolume(volume) {
        volume = (volume / 100);
        if (this.thisIsBackendGameEngine) return;

        if (this.bgMusic && this.settings.playSound) {
            this.bgMusic.volume = volume;
        }
    }

    toggleSound() {
        if (this.thisIsBackendGameEngine) return;
        if (this.settings.playSound) {
            let music;

            if (this.isTutorialMode || (this.turn && this.turn.player.type === PLAYER_TYPES.HUMAN)) {
                music = IN_GAME_MUSIC;
            } else if (this.turn && this.turn.player.type === PLAYER_TYPES.AI) {
                music = AI_MUSIC;
            } else {
                music = MAIN_MUSIC;
            }
            this.setMusic(music);
        } else {
            this.gameAnnouncerService.mute();
            if (this.bgMusic)
                this.bgMusic.pause();
        }
    }

    setPlayerType(playerName, type) {
        this.players.get(playerName).type = type;
        this.iterator.updatePlayerType(playerName, type);
    }

    setMusic(music = MAIN_MUSIC) {
        if (this.thisIsBackendGameEngine) return;

        if (this.settings.playSound) {
            if (this.currentMusicPlaying && this.currentMusicPlaying === music && !this.bgMusic.paused) {
                return;
            } else {
                if (this.bgMusic) {
                    this.bgMusic.pause();
                    this.bgMusic.currentTime = 0;
                }

                this.bgMusic = new Audio(music);
                this.currentMusicPlaying = music;
                this.bgMusic.loop = true;
                this.bgMusic.volume = (this.settings.musicVolume / 100);
                this.bgMusic.play();
            }
        }
    }

    initMap() {
        // Initialize world map
        this.map = new WorldMap(this.selectedMap);
    }

    startGame(players, winningCondition, aiTesting = false) {
        console.log('Game started!');

        this.filter = 'byOwner';

        // Initialize player list
        this.players = new Map();
        players.forEach(player => {
            this.players.set(player.name, player);
        });

        this.players.forEach(x => {
            x.cards = [];
            x.dead = false;
        });
        this.cardDeck = initiatieCardDeck(worldMap);

        if (!this.currentGameIsMultiplayer) {
            this.iterator = playerIterator(Array.from(this.players), [TURN_PHASES.DEPLOYMENT, TURN_PHASES.ATTACK, TURN_PHASES.MOVEMENT]);
            this.turn = this.iterator.getCurrent();
        }

        this.deploymentHandler = new DeploymentHandler();

        this.winningCondition = winningCondition;

        // Setup game table
        if (!this.currentGameIsMultiplayer) {
            this.setupInitDeployment();
        }

        console.log('Current turn: ', this.turn);
        this.handleTurnPhase();

        this.aiTesting = aiTesting;

        this.updateStandings();

        this.setMusic(this.turn.player.type === PLAYER_TYPES.HUMAN ? IN_GAME_MUSIC : AI_MUSIC);

        this.startGameTimestamp = Date.now();
    }

    updateStandings() {
        this.standings = getCurrentOwnershipStandings(this.map, this.players);
        console.log('Standings', this.standings);
    }

    nextTurn() {
        this.selectedTerritory = undefined;
        this.iterator.next();
        this.turn = this.iterator.getCurrent();
        this.handleTurnPhase();
        return this.turn;
    }

    handleTurnPhase() {
        if (this.turn.turnPhase === TURN_PHASES.DEPLOYMENT) {
            this.reinforcementData = this.deploymentHandler.calculateReinforcements(this.players, this.map, this.turn);
            this.troopsToDeploy = this.reinforcementData.totalReinforcements;
            // Update stats
            this.players.get(this.turn.player.name).statistics.totalReinforcements += this.troopsToDeploy;
        }
    }

    setupInitDeployment() {
        const totalNumberOfPlayers = this.players.size;
        const names = Array.from(this.players.keys());

        let currentPlayerIndex = 0;
        const territories = this.map.getAllTerritoriesAsList();
        shuffle(territories);

        territories.forEach(territory => {
            currentPlayerIndex = ((totalNumberOfPlayers - 1) === currentPlayerIndex) ? 0 : (currentPlayerIndex + 1);
            territory.owner = names[currentPlayerIndex];
            territory.numberOfTroops = 1;
        });
    }

    addTroopToTerritory(country) {
        const territory = getTerritoryByName(this.map, country);
        if (this.troopsToDeploy > 0 && territory.owner === this.turn.player.name) {
            this.troopsToDeploy--;
            territory.numberOfTroops++;
        }
    }

    takeCard(player) {
        if (!this.turn.playerHasWonAnAttackThisTurn) {
            if (this.cardDeck.length === 0) {
                this.cardDeck = initiatieCardDeck(worldMap);
            }

            const cardToTake = this.cardDeck[0];
            this.cardDeck.shift();
            this.players.get(player).cards.push(cardToTake);
            this.turn.playerHasWonAnAttackThisTurn = true;
        }
    }

    checkIfPlayerWonTheGame() {
        if (this.winningCondition.type === 'mapControl') {
            const goalPercentage = this.winningCondition.percentage;

            const territoriesOwned = getTerritoriesByOwner(this.map, this.turn.player.name).length;
            const territoriesTotal = this.map.getAllTerritoriesAsList().length;
            const currentPercentageForPlayer = (territoriesOwned / territoriesTotal * 100);

            if (currentPercentageForPlayer >= goalPercentage) {
                if (this.aiTesting) {
                    // Set new ai values and restart the game and log values somewhere
                    const playerWhoWon = this.turn.player.name;
                    const playerWhoLost = Array.from(this.players.entries()).find(x => x[0] !== playerWhoWon)[0];

                    let winner = this.players.get(playerWhoWon);
                    let loser = this.players.get(playerWhoLost);

                    loser.aiValues = {
                        closeToCaptureRegionPercentage: randomIntFromInterval(55, 80),
                        opportunityToEliminatePlayer: randomIntFromInterval(1, 10),
                        belongsToBigThreat: randomIntFromInterval(1, 10),
                        mostTroopsInThisRegion: randomIntFromInterval(1, 10),
                        closeToCaptureRegion: randomIntFromInterval(1, 10),
                        canBeAttackedToBreakUpRegion: randomIntFromInterval(1, 10),
                        lastTerritoryLeftInRegion: randomIntFromInterval(1, 10),
                        bonusTroopsForRegionMultiplier: randomDoubleFromInterval(0.1, 1.5),
                        bigThreatMultiplier: randomDoubleFromInterval(1.1, 2.0),
                        extraPointsForBreakUpRegionForBigThreat: randomIntFromInterval(1, 10),
                        movementTerritoryIsFrontlineForControlledRegion: randomIntFromInterval(1, 10),
                        movementTerritoryHasBorderWithEnemy: randomIntFromInterval(1, 10),
                        movmentTotalBorderingTroopsMultiplier: randomDoubleFromInterval(0.2, 1.5),
                        movementTerritoryIsFrontlineRegionBonusTroopsMultiplier: randomDoubleFromInterval(1.0, 3.0),
                        movementPlayerThreatPointsLessThanTotalBordering: randomIntFromInterval(1, 10),
                        movementPlayerThreatPointsLessThanTotalBorderingTroopMultiplier: randomDoubleFromInterval(0.2, 0.8),
                        movementTerritoryWithSafeBordersAmountOfTroops: randomIntFromInterval(1, 10),
                        movementTerritoryWithSafeBordersExtraTroops: randomIntFromInterval(1, 10)
                    };

                    window.aiTestingResults.games.push({
                        winner: Object.assign({}, winner),
                        loser: Object.assign({}, loser),
                        numberOfTurns: this.turn.turnNumber
                    });

                    this.$rootScope.players = [winner, loser];
                    this.$rootScope.currentGamePhase = GAME_PHASES.END_SCREEN;

                    return {
                        playerWon: true,
                        playerPercentage: currentPercentageForPlayer
                    };
                } else {
                    this.endGameTimestamp = Date.now();

                    console.log(`Player ${this.turn.player.name} won!`);
                    this.setMusic(VICTORY_MUSIC);
                    this.playerWhoWon = this.turn.player.name;
                    this.$rootScope.currentGamePhase = GAME_PHASES.END_SCREEN;
                    setTimeout(() => {
                        const name = this.turn.player.avatar.pronounciation ? this.turn.player.avatar.pronounciation : this.turn.player.name;
                        if (this.settings.playSound) {
                            this.gameAnnouncerService.speak(`${name} has won the game!`, () => {
                                if (this.settings.musicVolume > MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING) {
                                    this.setMusicVolume(MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING);
                                }
                            }, () => {
                                this.setMusicVolume(this.settings.musicVolume);
                            });
                        }
                    }, 1000);
                    return {
                        playerWon: true,
                        playerPercentage: currentPercentageForPlayer
                    };
                }
            } else {
                return {
                    playerWon: false,
                    playerPercentage: currentPercentageForPlayer
                };
            }
        }
    }

    handleDefeatedPlayer(defeatedPlayer, playerWhoDefeatedHim) {
        if (!this.currentGameIsMultiplayer && this.settings.playSound) {
            this.gameAnnouncerService.speak(`Player ${defeatedPlayer} was eliminated by player ${playerWhoDefeatedHim}`, () => {
                if (this.settings.musicVolume > MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING) {
                    this.setMusicVolume(MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING);
                }
            }, () => {
                this.setMusicVolume(this.settings.musicVolume);
            });
        }

        const cards = this.players.get(defeatedPlayer).cards;
        this.players.get(playerWhoDefeatedHim).cards = this.players.get(playerWhoDefeatedHim).cards.concat(cards);
        this.players.get(defeatedPlayer).dead = true;
        this.players.get(defeatedPlayer).deadTurn = this.turn.turnNumber;
        this.iterator.handleDefeatedPlayer(this.players.get(defeatedPlayer).name);
        return cards;
    }
}

module.exports = GameEngine;