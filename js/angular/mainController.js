import {GAME_PHASES, TURN_PHASES, MAX_CARDS_ON_HAND, MUSIC_VOLUME_WHEN_VOICE_IS_SPEAKING, MUSIC_VOLUME_DURING_TUTORIAL} from './../gameConstants';
import {getTerritoryByName, getTerritoriesByOwner} from './../map/mapHelpers';
import Player from './../player/player';
import {PLAYER_COLORS, avatars, PLAYER_TYPES} from './../player/playerConstants';
import {delay} from './../helpers';

export default class MainController {

    constructor($scope, $uibModal, gameEngine, soundService, mapService, tutorialService) {
        this.vm = this;

        // PUBLIC FUNCTIONS
        this.vm.filterByOwner = this.filterByOwner;
        this.vm.filterByRegion = this.filterByRegion;
        this.vm.nextTurn = this.nextTurn;
        this.vm.turnInCards = this.turnInCards;
        this.vm.checkIfNextIsDisabled = this.checkIfNextIsDisabled;
        this.vm.getCurrentPlayerColor = this.getCurrentPlayerColor;
        this.vm.startGame = this.startGame;
        this.vm.toggleMusicVolume = this.toggleMusicVolume;
        this.vm.testAttackPhase = this.testAttackPhase;
        this.vm.testPresentationModal = this.testPresentationModal;
        this.vm.playSound = true;

        this.vm.gamePhases = GAME_PHASES;
        this.vm.currentGamePhase = GAME_PHASES.PLAYER_SETUP;

        this.vm.turn = {};

        this.$scope = $scope;
        this.$uibModal = $uibModal;
        this.gameEngine = gameEngine;
        this.soundService = soundService;
        this.mapService = mapService;
        this.tutorialService = tutorialService;

        console.log('Initialization of mainController');
    }

    toggleMusicVolume() {
        this.vm.playSound = !this.vm.playSound;
        this.gameEngine.toggleSound(this.vm.playSound);
    }

    startGame(players) {
        this.gameEngine.startGame(players);

        this.vm.currentGamePhase = this.vm.gamePhases.GAME;
        this.vm.troopsToDeploy = this.gameEngine.troopsToDeploy;

        document.querySelectorAll('.country').forEach(country => {
            country.addEventListener('click', (e) => {
                this.clickCountry(e);
            });
        });
        document.querySelectorAll('.troopCounter').forEach(country => {
            country.addEventListener('click', (e) => {
                this.clickCountry(e);
            });
        });
        document.querySelectorAll('.troopCounterText').forEach(country => {
            country.addEventListener('click', (e) => {
                this.clickCountry(e);
            });
        });

        this.vm.turn = this.gameEngine.turn;
        this.vm.filter = this.gameEngine.filter;
        this.mapService.updateMap(this.gameEngine.filter);

        this.$uibModal.open({
            templateUrl: 'turnPresentationModal.html',
            backdrop: 'static',
            windowClass: 'riskModal',
            controller: 'turnPresentationController',
            controllerAs: 'turnPresentation',
            resolve: {
                data: () => {
                    return {
                        type: 'startGame'
                    };
                }
            }
        }).result.then(closeResponse => {
            this.checkIfPlayerMustTurnInCards();
        });
    }

    checkIfPlayerMustTurnInCards() {
        if (this.vm.turn.turnPhase === TURN_PHASES.DEPLOYMENT) {
            this.vm.troopsToDeploy = this.gameEngine.troopsToDeploy;

            if (this.vm.turn.player.cards.length >= MAX_CARDS_ON_HAND) {
                this.turnInCards();
            }
        }
    }

    turnInCards() {
        this.$uibModal.open({
            templateUrl: 'cardTurnInModal.html',
            backdrop: 'static',
            windowClass: 'riskModal',
            controller: 'cardTurnInModalController',
            controllerAs: 'cardTurnIn',
                resolve: {
                    data: () => {
                        return {
                            type: 'normal'
                        }
                    }
                }
        }).result.then(closeResponse => {
            if (closeResponse && closeResponse.newTroops) {
                console.log(`Cards turned in for ${closeResponse.newTroops} new troops`);
                $('#mainTroopIndicator').addClass('animated infinite bounce');
                this.soundService.cardTurnIn.play();
                this.gameEngine.troopsToDeploy += closeResponse.newTroops;
                this.vm.troopsToDeploy = this.gameEngine.troopsToDeploy;
                setTimeout(() => {
                    this.$scope.$apply();
                }, 100);
                setTimeout(() => {
                    $('#mainTroopIndicator').removeClass('animated infinite bounce');
                }, 1000);
            }
        });
    }

    nextTurn() {
        this.vm.turn = this.gameEngine.nextTurn();

        this.$uibModal.open({
            templateUrl: 'turnPresentationModal.html',
            backdrop: 'static',
            windowClass: 'riskModal',
            controller: 'turnPresentationController',
            controllerAs: 'turnPresentation',
            resolve: {
                data: () => {
                    return {
                        type: 'newTurn'
                    };
                }
            }
        }).result.then(closeResponse => {
            this.mapService.updateMap(this.gameEngine.filter);
            this.checkIfPlayerMustTurnInCards();
            console.log('New turn: ', this.vm.turn);
            console.log('Current carddeck: ', this.gameEngine.cardDeck);
        });
    }

    checkIfPlayerWonTheGame() {
        // to do
    }

    filterByOwner() {
        this.vm.filter = 'byOwner';
        this.gameEngine.filter = 'byOwner';
        this.mapService.updateMap(this.gameEngine.filter);
    }

    filterByRegion() {
        this.vm.filter = 'byRegion';
        this.gameEngine.filter = 'byRegion';
        this.mapService.updateMap(this.gameEngine.filter);
    }

    checkIfNextIsDisabled() {
        if (!this.gameEngine.turn) {
            return;
        }
        if (this.gameEngine.turn.turnPhase === TURN_PHASES.DEPLOYMENT && this.gameEngine.troopsToDeploy > 0) {
            return true;
        }
        return false;
    }

    getCurrentPlayerColor() {
        return this.gameEngine.players ? this.gameEngine.players.get(this.vm.turn.player.name).color.mainColor : '';
    }

    testAttackPhase(players) {
        this.gameEngine.startGame(players);
        this.vm.turn = this.gameEngine.turn;
        const clickedTerritory = getTerritoryByName(this.gameEngine.map, 'Egypt');
        const attackFrom = getTerritoryByName(this.gameEngine.map, 'Scandinavia');
        clickedTerritory.owner = 'Julius Caesar';
        clickedTerritory.numberOfTroops = 5;
        attackFrom.owner = 'Napoleon Bonaparte';
        attackFrom.numberOfTroops = 3;
        this.gameEngine.selectedTerritory = attackFrom;

        this.gameEngine.setMusic('./audio/bgmusic_attack.mp3');
        this.engageAttackPhase(clickedTerritory);
    }

    testPresentationModal() {
        this.tutorialService.testPresentationModal();
    }

    engageAttackPhase(clickedTerritory) {
        this.$uibModal.open({
            templateUrl: 'attackModal.html',
            backdrop: 'static',
            windowClass: 'riskModal',
            controller: 'attackModalController',
            controllerAs: 'attack',
            resolve: {
                attackData: () => {
                    return {
                        territoryAttacked: clickedTerritory,
                        attackFrom: this.gameEngine.selectedTerritory,
                        attacker: this.gameEngine.players.get(this.gameEngine.selectedTerritory.owner),
                        defender: this.gameEngine.players.get(clickedTerritory.owner)
                    }
                }
            }
        }).result.then(closeResponse => {
            this.gameEngine.setMusic();
            console.log('Battle is over ', closeResponse);
            this.updatePlayerDataAfterAttack(closeResponse);
            this.checkIfPlayerWonTheGame();
        });
    }

    updatePlayerDataAfterAttack(closeResponse) {
        const territoryAttacking = getTerritoryByName(this.gameEngine.map, closeResponse.attackFrom.name);

        territoryAttacking.owner = closeResponse.attackFrom.owner;
        territoryAttacking.numberOfTroops = closeResponse.attackFrom.numberOfTroops === 0 ? 1 : closeResponse.attackFrom.numberOfTroops;

        const territoryAttacked = getTerritoryByName(this.gameEngine.map, closeResponse.attackTo.name);

        territoryAttacked.owner = closeResponse.attackTo.owner;
        territoryAttacked.numberOfTroops = closeResponse.attackTo.numberOfTroops;

        if (closeResponse.battleWasWon) {
            if (!this.gameEngine.turn.playerHasWonAnAttackThisTurn) {
                this.soundService.cardSelect.play();
            }
            this.gameEngine.takeCard(closeResponse.attackFrom.owner);

            const territories = getTerritoriesByOwner(this.gameEngine.map, closeResponse.previousOwner);
            if (territories.length === 0) {
                // The losing player was defeated entirely
                const resp = this.gameEngine.handleDefeatedPlayer(closeResponse.previousOwner, territoryAttacking.owner);
                if (resp.legth > 0) {
                    this.soundService.cardSelect.play();
                }
            }
        }

        this.mapService.updateMap(this.vm.filter);
    }

    clickCountry(evt) {
        let country = evt.target.getAttribute('id');
        if (!country) {
            country = evt.target.getAttribute('for');
        }
        const clickedTerritory = getTerritoryByName(this.gameEngine.map, country);

        if (this.gameEngine.turn.turnPhase === TURN_PHASES.DEPLOYMENT) {
            if (this.gameEngine.troopsToDeploy > 0 && clickedTerritory.owner === this.gameEngine.turn.player.name) {
                this.soundService.addTroopSound.play();
            }
            this.gameEngine.addTroopToTerritory(country);
            this.mapService.updateMap(this.gameEngine.filter);
            this.vm.troopsToDeploy = this.gameEngine.troopsToDeploy;
            this.$scope.$apply();
        } else if (this.gameEngine.turn.turnPhase === TURN_PHASES.ATTACK) {
            if (this.gameEngine.selectedTerritory &&
                clickedTerritory.owner !== this.gameEngine.turn.player.name &&
                clickedTerritory.adjacentTerritories.includes(this.gameEngine.selectedTerritory.name) &&
                this.gameEngine.selectedTerritory.numberOfTroops > 1) {

                this.gameEngine.setMusic('./audio/bgmusic_attack.mp3');
                this.engageAttackPhase(clickedTerritory);
            } else {
                this.gameEngine.selectedTerritory = clickedTerritory;
                this.mapService.updateMap(this.gameEngine.filter);
                this.mapService.hightlightTerritory(country);
            }
        } else if (this.gameEngine.turn.turnPhase === TURN_PHASES.MOVEMENT) {
            if (this.gameEngine.selectedTerritory &&
                this.gameEngine.selectedTerritory.name === clickedTerritory.name) {
                this.gameEngine.selectedTerritory = undefined;
                this.mapService.updateMap(this.gameEngine.filter);
            } else if (this.gameEngine.selectedTerritory &&
                       clickedTerritory.owner === this.gameEngine.turn.player.name &&
                       this.gameEngine.selectedTerritory.numberOfTroops > 1 &&
                       clickedTerritory.name !== this.gameEngine.selectedTerritory.name &&
                       this.mapService.getTerritoriesForMovement(this.gameEngine.selectedTerritory).includes(clickedTerritory.name)) {
                // move troops
                this.engageMovementPhase(clickedTerritory);
            } else {
                this.gameEngine.selectedTerritory = clickedTerritory;
                this.mapService.updateMap(this.gameEngine.filter);
                if (this.gameEngine.selectedTerritory.numberOfTroops > 1) {
                    this.mapService.hightlightTerritory(country);
                }
            }
        }
    }

    engageMovementPhase(toTerritory) {
        this.$uibModal.open({
            templateUrl: 'movementModal.html',
            backdrop: 'static',
            windowClass: 'riskModal',
            controller: 'movementModalController',
            controllerAs: 'movement',
            resolve: {
                moveTo: () => {
                    return toTerritory;
                },
                moveFrom: () => {
                    return this.gameEngine.selectedTerritory;
                }
            }
        }).result.then(closeResponse => {
            this.gameEngine.setMusic();
            console.log('Movement complete ', closeResponse);
            const movementFromTerritory = getTerritoryByName(this.gameEngine.map, closeResponse.from.name);

            movementFromTerritory.numberOfTroops = closeResponse.from.numberOfTroops === 0 ? 1 : closeResponse.from.numberOfTroops;

            const movementToTerritory = getTerritoryByName(this.gameEngine.map, closeResponse.to.name);

            movementToTerritory.numberOfTroops = closeResponse.to.numberOfTroops;

            this.mapService.updateMap(this.vm.filter);
            this.nextTurn();
        });
    }

    /*
     *  EVERYTHING BELOW THIS LINE IS FOR THE TUTORIAL MODE
     */

    startTutorial() {
        if (!this.vm.playSound) {
            this.toggleMusicVolume()
        }

        const players = Array.from(
            new Array(4), (x, i) =>
                new Player(Object.keys(avatars).map(key => key)[i],
                           Object.keys(PLAYER_COLORS).map(key => PLAYER_COLORS[key])[i],
                           Object.keys(avatars).map(key => avatars[key])[i],
                           PLAYER_TYPES.HUMAN)
        );
        this.gameEngine.startGame(players);

        this.gameEngine.isTutorialMode = true;
        this.vm.isTutorialMode = true;

        this.vm.currentGamePhase = this.vm.gamePhases.GAME;
        this.vm.troopsToDeploy = this.gameEngine.troopsToDeploy;

        this.vm.turn = this.gameEngine.turn;
        this.vm.filter = this.gameEngine.filter;
        this.mapService.updateMap(this.gameEngine.filter);

        this.gameEngine.setMusicVolume(MUSIC_VOLUME_DURING_TUTORIAL);

        this.tutorialService.initTutorialData();

        this.tutorialService.openingMessage()
        .then(() => this.tutorialService.phasesAndMapExplanation())
        .then(() => this.tutorialService.deploymentPhaseExplanation())
        .then(() => this.tutorialService.deploymentIndicatorExplanation())
        .then(() => this.tutorialService.reinforcementRulesExplanation())
        .then(() => this.tutorialService.regionFilterExplanation())
        .then(() => this.filterByRegionForTutorial())
        .then(() => delay(1500))
        .then(() => this.tutorialService.ownerFilterExplanation())
        .then(() => this.filterByOwnerForTutorial())
        .then(() => delay(1500))
        .then(() => this.tutorialService.reinforcementIntoTerritoryDemonstration())
        .then(() => this.deployTroopsToTerritoryForTutorial())
        .then(() => this.tutorialService.goingForwardToAttackPhase())
        .then(() => { this.vm.turn = this.gameEngine.nextTurn() })
        .then(() => this.tutorialService.attackPhaseExplanation())
        .then(() => this.tutorialService.readyToInvadeExplanation())
        .then(() => this.selectTerritoryToAttackFromForTutorial())
        .then(() => this.tutorialService.hightlightExplanation())
        .then(() => this.tutorialService.attackModalStart())
        .then((closeResponse) => this.handleAttackModalResponseForTutorial(closeResponse))
        .then(() => this.tutorialService.cardExplanation())
        .then(() => this.tutorialService.cardExplanation2())
        .then(() => this.tutorialService.openCardModal());
    }

    filterByRegionForTutorial() {
        return new Promise((resolve, reject) => {
            this.filterByRegion();
            resolve();
        });
    }

    filterByOwnerForTutorial() {
        return new Promise((resolve, reject) => {
            this.filterByOwner();
            resolve();
        });
    }

    deployTroopsToTerritoryForTutorial() {
        const currentPlayer = this.gameEngine.turn.player.name;
        const territories = getTerritoriesByOwner(this.gameEngine.map, this.gameEngine.turn.player.name);
        const territory = territories.find(terr => {
            return terr.adjacentTerritories.some(adjTerr => getTerritoryByName(this.gameEngine.map, adjTerr).owner !== currentPlayer);
        });
        const promises = [];
        for (let i = 0; i < this.gameEngine.troopsToDeploy; i++) {
            promises.push(new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.simulateClickCountry(territory.name);
                    resolve();
                }, 700 * (i + 1));
            }));
        }
        return Promise.all(promises);
    }

    selectTerritoryToAttackFromForTutorial() {
        const currentPlayer = this.gameEngine.turn.player.name;
        const territories = getTerritoriesByOwner(this.gameEngine.map, this.gameEngine.turn.player.name);
        const territory = territories.find(terr => {
            return terr.adjacentTerritories.some(adjTerr => getTerritoryByName(this.gameEngine.map, adjTerr).owner !== currentPlayer);
        });
        return new Promise((resolve, reject) => {
            this.simulateClickCountry(territory.name);
            this.soundService.click.play();
            resolve();
        });
    }

    handleAttackModalResponseForTutorial(closeResponse) {
        return new Promise((resolve, reject) => {
            this.gameEngine.setMusic();
            this.gameEngine.setMusicVolume(MUSIC_VOLUME_DURING_TUTORIAL);
            this.updatePlayerDataAfterAttack(closeResponse);
            resolve();
        });
    }

    simulateClickCountry(territory) {
        this.clickCountry({
            target: {
                getAttribute: () => {
                    return territory;
                }
            }
        });
    }
}
