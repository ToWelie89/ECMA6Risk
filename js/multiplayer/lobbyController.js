const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/database');
const { GAME_PHASES, CONSTANTS, VICTORY_GOALS, TURN_LENGTHS } = require('./../gameConstants');
const { normalizeTimeFromTimestamp, getRandomColor, lightenDarkenColor, objectsAreEqual, loadSvgIntoDiv } = require('./../helpers');
const { avatars, PLAYER_TYPES } = require('./../player/playerConstants');
const CountryCodes = require('./../editor/countryCodes');
const { getPlayerTooltipMarkup } = require('./../tooltips/tooltipHelpers');

class LobbiesController {
    constructor($scope, $rootScope, $sce, $compile, $timeout, $uibModal, soundService, toastService, gameEngine, socketService, settings) {
        this.vm = this;
        this.$scope = $scope;
        this.$rootScope = $rootScope;
        this.$sce = $sce;
        this.$compile = $compile;
        this.$timeout = $timeout;
        this.soundService = soundService;
        this.toastService = toastService;
        this.$uibModal = $uibModal;
        this.gameEngine = gameEngine;
        this.socketService = socketService;
        this.settings = settings;
        this.vm.customCharacters = [];

        this.lobbyId = -1;

        if (this.$rootScope.currentLobbyWatcher) {
            this.$rootScope.currentLobbyWatcher();
        }
        this.$rootScope.currentLobbyWatcher = this.$rootScope.$watch('currentLobby', (newVal, oldVal) => {            
            console.log(oldVal.id, newVal.id)
            if (!!newVal && !this.lobbyInitialized) {
                this.lobbyInitialized = true;
                this.initLobby();
            }
        });

        this.vm.victoryGoals = VICTORY_GOALS;

        this.vm.turnLengthSliderOptions = {
            showTicks: true,
            stepsArray: TURN_LENGTHS,
            onChange: () => {
                this.socketService.gameSocket.emit('setTurnLength', this.vm.room.id, this.vm.turnLength);
            }
        };

        this.vm.aiSpeedSliderOptions = {
            showTicks: true,
            stepsArray: ['Slow', 'Medium', 'Fast'],
            onChange: () => {
                this.socketService.gameSocket.emit('setAiSpeed', this.vm.room.id, this.vm.aiSpeed);
            }
        };

        this.vm.players = [];

        this.vm.lobbyChatMessage = '';
        this.vm.lobbyChatMessages = [];
        this.vm.globalChatMessage = '';
        this.vm.globalChatMessages = [];
        this.vm.unreadLobbyMessages = 0;
        this.vm.unreadGlobalMessages = 0;
        this.vm.chatMaxLengthMessage = 150;
        this.vm.muteChat = false;
        this.firstLoad = true;

        this.globalChatColor = getRandomColor();

        this.$rootScope.$watch('currentGamePhase', () => {
            this.vm.currentGamePhase = this.$rootScope.currentGamePhase;
            if (this.vm.currentGamePhase === GAME_PHASES.PLAYER_SETUP_MULTIPLAYER) {
                this.vm.playerTooltips = {};
            }
        });

        firebase.database().ref('globalChat').on('value', snapshot => {
            if (!this.vm.muteChat && this.$rootScope.currentGamePhase === GAME_PHASES.PLAYER_SETUP_MULTIPLAYER && !this.firstLoad && !this.vm.showLobbyChat) {
                this.soundService.newMessage.play();
            }
            if (this.vm.showLobbyChat && !this.firstLoad) {
                this.vm.unreadGlobalMessages++;
            }
            this.firstLoad = false;
            const messages = snapshot.val();

            this.vm.globalChatMessages = [];
            for (let message in messages) {
                this.vm.globalChatMessages.push(messages[message]);
            }

            this.vm.globalChatMessages.map(message => {
                message.normalizedTime = normalizeTimeFromTimestamp(message.timestamp);
            });

            this.vm.globalChatMessages.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });

            // Get last 100
            this.vm.globalChatMessages = this.vm.globalChatMessages.slice(this.vm.globalChatMessages.length - 100, this.vm.globalChatMessages.length);

            console.log('Global chat messags', this.vm.globalChatMessages);
            this.$timeout(() => {
                this.$scope.$apply();
                document.querySelectorAll('.chatMessagesContainer').forEach(el => {
                    el.scrollTop = el.scrollHeight;
                });
            }, 1);
        });

        this.vm.leaveLobby = this.leaveLobby;
        this.vm.sendMessage = this.sendMessage;
        this.vm.charactersLeft = this.charactersLeft;
        this.vm.switchChat = this.switchChat;
        this.vm.lightenDarkenColor = this.lightenDarkenColor;
        this.vm.lockUnlockSlot = this.lockUnlockSlot;
        this.vm.existingPlayers = this.existingPlayers;
        this.vm.kickPlayer = this.kickPlayer;
        this.vm.openSelectionScreen = this.openSelectionScreen;
        this.vm.getStartTooltip = this.getStartTooltip;
        this.vm.startGameIsDisabled = this.startGameIsDisabled;
        this.vm.startGame = this.startGame;
        this.vm.updateColorOfPlayer = this.updateColorOfPlayer;
        this.vm.addAi = this.addAi;
        this.vm.addAiDisabled = this.addAiDisabled;
    }

    addAi() {
        this.soundService.tick.play();
        this.socketService.gameSocket.emit('addAiPlayer', this.vm.room.id);
    }

    addAiDisabled() {
        return this.vm.players.filter(x => x !== undefined).length === CONSTANTS.MAX_NUMBER_OF_PLAYERS;
    }

    updateColorOfPlayer(player, color) {
        this.socketService.gameSocket.emit('setPlayerColor', this.vm.room.id, player.userUid, color.name);
    }

    setGoal(goal) {
        this.vm.chosenGoal = goal;
        this.soundService.tick.play();
        this.socketService.gameSocket.emit('setGoal', this.vm.room.id, this.vm.chosenGoal);
    }

    initLobby() {
        this.vm.room = this.$rootScope.currentLobby;
        if (this.vm.room) {
            const user = firebase.auth().currentUser;
            this.vm.myUid = user.uid;
            this.vm.lockedSlots = [];
            this.vm.unreadLobbyMessages = 0;
            this.vm.unreadGlobalMessages = 0;
            this.vm.showLobbyChat = true;
            this.vm.lobbyChatMessage = '';
            this.vm.globalChatMessage = '';

            console.log('This room', this.vm.room);

            loadSvgIntoDiv(this.vm.room.map.mainMap, '#lobbyMapContainer');

            this.vm.userIsHost = this.vm.room.creatorUid === user.uid;
            this.vm.turnLengthSliderOptions.disabled = !this.vm.userIsHost;
            this.vm.aiSpeedSliderOptions.disabled = !this.vm.userIsHost;
            const userName = user.displayName ? user.displayName : user.email;

            if (!this.socketService.gameSocket) {
                this.socketService.createGameSocket();
            }
            this.addSocketListeners();

            firebase.database().ref('/users/' + user.uid).once('value').then(snapshot => {
                const userData = snapshot.val();
                let chosenAvatar;

                if (userData) {
                    if (userData.characters) {
                        this.vm.customCharacters = userData.characters;
                    }

                    if (userData.defaultAvatar) {
                        if (userData.characters && userData.characters.find(c => c.id === userData.defaultAvatar)) {
                            const chosenDefaultAvatar = userData.characters.find(c => c.id === userData.defaultAvatar);
                            chosenDefaultAvatar.customCharacter = true;

                            chosenAvatar = chosenDefaultAvatar;
                        } else if (Object.values(avatars).find(x => x.id === userData.defaultAvatar)) {
                            const chosenDefaultAvatar = Object.values(avatars).find(x => x.id === userData.defaultAvatar);
                            chosenDefaultAvatar.customCharacter = false;

                            chosenAvatar = chosenDefaultAvatar;
                        }
                    }
                }

                this.socketService.gameSocket.emit('setUser', user.uid, userName, this.vm.room.id, this.vm.userIsHost, chosenAvatar, this.settings.attackerDice, this.settings.attackerDiceLabel);
                this.socketService.gameSocket.emit('sendMessage', this.vm.room.id, {
                    sender: 'SERVER',
                    uid: 'SERVER',
                    message: `${userName} connected to the room`,
                    timestamp: Date.now()
                });
            });
        }
    }

    switchChat(showLobbyChat) {
        this.vm.showLobbyChat = showLobbyChat;
        if (this.vm.showLobbyChat) {
            this.vm.unreadLobbyMessages = 0;
        } else {
            this.vm.unreadGlobalMessages = 0;
        }
        this.$timeout(() => {
            document.querySelectorAll('.chatMessagesContainer').forEach(el => {
                el.scrollTop = el.scrollHeight;
            });
        }, 20);
    }

    charactersLeft () {
        return this.vm.showLobbyChat
            ? (this.vm.chatMaxLengthMessage - this.vm.lobbyChatMessage.length)
            : (this.vm.chatMaxLengthMessage - this.vm.globalChatMessage.length);
    }

    openSelectionScreen(clickedPlayer) {
        const user = firebase.auth().currentUser;
        const uid = user.uid;
        const currentSelectedPlayer = this.vm.players.find(x => x.userUid === uid);

        if (clickedPlayer.userUid !== uid) {
            return;
        }

        this.soundService.tick.play();

        this.$uibModal.open({
            templateUrl: 'src/modals/characterSelectionModal.html',
            backdrop: 'static',
            windowClass: 'riskModal characterSelect',
            controller: 'characterSelectionController',
            controllerAs: 'characterSelection',
            keyboard: false,
            animation: false,
            resolve: {
                currentSelectedPlayer: () => currentSelectedPlayer,
                selectedPlayers: () => this.vm.players,
                multiplayer: () => true,
                customCharacters: () => this.vm.customCharacters
            }
        }).result.then(closeResponse => {
            $('.mainWrapper').css('filter', 'none');
            $('.mainWrapper').css('-webkit-filter', 'none');
            
            if (closeResponse.cancel) {
                return;
            }

            if (!objectsAreEqual(closeResponse.avatar, currentSelectedPlayer.avatar)) {
                this.socketService.gameSocket.emit('updateAvatar', this.vm.room.id, uid, closeResponse.avatar);
            }

            console.log(closeResponse);
        });
    }

    addSocketListeners() {
        this.socketService.setGameListener('updatedColorOfPlayer', (ev, {playerUid, playerColor}) => {
            const player = this.vm.players.find(p => p.userUid === playerUid);
            if (player) {
                player.color = playerColor;
            }
        });

        this.socketService.setGameListener('messagesUpdated', (ev, {messages}) => {
            if (!this.vm.muteChat && this.$rootScope.currentGamePhase === GAME_PHASES.PLAYER_SETUP_MULTIPLAYER && this.vm.showLobbyChat) {
                this.soundService.newMessage.play();
            }

            if (!this.vm.showLobbyChat) {
                this.vm.unreadLobbyMessages++;
            }

            this.vm.lobbyChatMessages = messages;
            this.vm.lobbyChatMessages.map(message => {
                message.normalizedTime = normalizeTimeFromTimestamp(message.timestamp);
            });
            this.$scope.$apply();

            this.$timeout(() => {
                document.querySelectorAll('.chatMessagesContainer').forEach(el => {
                    el.scrollTop = el.scrollHeight;
                });
            }, 20);

            console.log('Lobby messages', this.vm.lobbyChatMessages);
        });

        this.socketService.setGameListener('kicked', (ev, {}) => {
            this.soundService.tick.play();
            this.$rootScope.currentLobby = '';
            this.$rootScope.currentGamePhase = GAME_PHASES.MULTIPLAYER_LOBBIES;
            this.toastService.errorToast('', 'You have been kicked from the lobby.');
            this.socketService.disconnectGameSocket();
        });

        this.socketService.setGameListener('hostLeft', (ev, {}) => {
            this.$rootScope.currentLobby = '';
            this.$rootScope.currentGamePhase = GAME_PHASES.MULTIPLAYER_LOBBIES;
            this.toastService.infoToast('', 'The host has left the game.');
            this.socketService.disconnectGameSocket();
        });

        this.socketService.setGameListener('updatedPlayers', (ev, {players}) => {
            this.setPlayers(players);
            console.log('Players updated in room', this.vm.players);
        });

        this.socketService.setGameListener('updatedLockedSlots', (ev, {lockedSlots}) => {
            this.soundService.tick.play();
            this.vm.lockedSlots = lockedSlots;
            this.setPlayers(this.vm.players);
            this.vm.room.maxNumberOfPlayer = (CONSTANTS.MAX_NUMBER_OF_PLAYERS - this.vm.lockedSlots.length);
        });

        this.socketService.setGameListener('setTurnLengthNotifier', (ev, {turnLength}) => {
            this.soundService.tick.play();
            this.vm.turnLength = turnLength;
            this.$rootScope.turnLength = turnLength;
            this.$scope.$apply();
            window.dispatchEvent(new Event('resize'));
        });
        
        this.socketService.setGameListener('setAiSpeedNotifier', (ev, {aiSpeed}) => {
            this.soundService.tick.play();
            this.vm.aiSpeed = aiSpeed;
            this.$scope.$apply();
            window.dispatchEvent(new Event('resize'));
        });

        this.socketService.setGameListener('setGoalNotifier', (ev, {chosenGoal}) => {
            this.soundService.tick.play();
            this.vm.chosenGoal = chosenGoal;
        });

        this.socketService.setGameListener('gameStarted', (ev, {players, victoryGoal, territories, turn, troopsToDeploy, selectedMap}) => {
            console.log('troopsToDeploy', troopsToDeploy);
            this.gameEngine.currentGameIsMultiplayer = true;
            this.gameEngine.turn = turn;
            this.gameEngine.troopsToDeploy = troopsToDeploy;
            this.gameEngine.selectedMap = selectedMap;

            this.gameEngine.initMap();

            this.gameEngine.map.getAllTerritoriesAsList().forEach(t => {
                const territoryFromServer = territories.find(x => x.name === t.name);
                t.owner = territoryFromServer.owner;
                t.numberOfTroops = territoryFromServer.numberOfTroops;
            });

            this.$rootScope.players = players;
            this.$rootScope.chosenGoal = victoryGoal;

            this.$rootScope.currentGamePhase = GAME_PHASES.GAME_MULTIPLAYER;

            this.$rootScope.$apply();
        });

        this.socketService.setGameListener('disconnect', (ev, {data}) => {
            if (data === 'transport close') { // server disconnected
                this.toastService.errorToast(
                    'Lost connection',
                    'Disconnected from server'
                );
                this.$rootScope.currentLobby = '';
                this.$rootScope.currentGamePhase = GAME_PHASES.MULTIPLAYER_LOBBIES;
                this.$rootScope.$apply();
            }
        });

        /*
        this.socketService.gameSocket.on('updatedColorOfPlayer', (playerUid, playerColor) => {
            const player = this.vm.players.find(p => p.userUid === playerUid);
            if (player) {
                player.color = playerColor;
            }
        });*/
    }

    setPlayers(players) {
        if (players.filter(x => x !== undefined).length === 0) {
            return;
        }
        this.vm.players = new Array(CONSTANTS.MAX_NUMBER_OF_PLAYERS).fill(undefined);
        players.forEach(p => {
            const indexes = Array.from(Array(CONSTANTS.MAX_NUMBER_OF_PLAYERS).keys());
            const indexToUse = indexes.find(i => !this.vm.lockedSlots.includes(i) && this.vm.players[i] === undefined);
            this.vm.players[indexToUse] = p;
        });

        this.vm.players.forEach(player => {
            if (player) {
                player.type = player.ai ? PLAYER_TYPES.AI : PLAYER_TYPES.HUMAN;

                if (!player.ai) {
                    this.fetchTooltipForPlayer(player);
                }
            }
        });

        this.$scope.$apply();
    }

    fetchTooltipForPlayer(player) {
        if (this.vm.playerTooltips[player.userUid]) {
            return;
        }

        this.vm.playerTooltips[player.userUid] = this.$sce.trustAsHtml(`
            <div class="playerTooltip">
                <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
            </div>
        `);
        this.$scope.$apply();

        firebase.database().ref('/users/' + player.userUid).once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                let url;
                if (userData.countryCode && CountryCodes[userData.countryCode]) {
                    url = `./assets/flagsSvg/countries/${userData.countryCode.toLowerCase()}.svg`;
                }

                var wavingFlag = this.$compile(`<waving-flag flag-width="90" flag-height="50" flag-url="'${url}'"></waving-flag>`)(this.$scope);

                setTimeout(() => {
                    const markup = getPlayerTooltipMarkup(wavingFlag[0].innerHTML, userData);
                    this.vm.playerTooltips[player.userUid] = this.$sce.trustAsHtml(markup);
                    this.$scope.$apply();
                }, 1000);
            }
        });
    }

    lightenDarkenColor(colorCode, amount) {
        return lightenDarkenColor(colorCode, amount);
    }

    sendMessageLobby() {
        this.vm.disableSendButton = true;
        this.$timeout(() => {
            this.vm.disableSendButton = false;
        }, 1000);

        if (!this.vm.muteChat) {
            this.soundService.tick.play();
        }
        const user = firebase.auth().currentUser;
        const userName = user.displayName ? user.displayName : user.email;
        this.socketService.gameSocket.emit('sendMessage', this.vm.room.id, {
            sender: userName,
            uid: user.uid,
            message: this.vm.lobbyChatMessage,
            timestamp: Date.now()
        });
        this.vm.lobbyChatMessage = '';
    }

    sendMessageGlobal() {
        this.vm.disableSendButton = true;
        this.$timeout(() => {
            this.vm.disableSendButton = false;
        }, 1000);

        if (!this.vm.muteChat) {
            this.soundService.tick.play();
        }
        const id = Math.floor((Math.random() * 100000000000) + 1);
        const user = firebase.auth().currentUser;
        const creator = user.displayName ? user.displayName : user.email;
        const message = this.vm.globalChatMessage;
        this.vm.globalChatMessage = '';
        firebase.database().ref('globalChat/' + id).set({
            timestamp: Date.now(),
            creator,
            creatorUid: user.uid,
            message,
            color: this.globalChatColor
        });
    }

    leaveLobby() {
        this.soundService.tick.play();
        const user = firebase.auth().currentUser;
        const userName = user.displayName ? user.displayName : user.email;

        this.socketService.gameSocket.emit('sendMessage', this.vm.room.id, {
            sender: 'SERVER',
            uid: 'SERVER',
            message: `${userName} left the room`,
            timestamp: Date.now()
        });

        this.$rootScope.currentLobby = '';
        this.$rootScope.currentGamePhase = GAME_PHASES.MULTIPLAYER_LOBBIES;
        this.socketService.disconnectGameSocket();
    }

    kickPlayer(player) {
        this.soundService.tick.play();
        this.socketService.gameSocket.emit('kickPlayer', this.vm.room.id, player.userUid);
    }

    lockUnlockSlot(index) {
        if (this.vm.lockedSlots.includes(index)) {
            this.vm.lockedSlots = this.vm.lockedSlots.filter(x => x !== index);
        } else {
            this.vm.lockedSlots.push(index);
        }

        this.socketService.gameSocket.emit('lockedSlots', this.vm.lockedSlots, this.vm.room.id);

        this.vm.room.maxNumberOfPlayer = (CONSTANTS.MAX_NUMBER_OF_PLAYERS - this.vm.lockedSlots.length);
        this.socketService.lobbiesSocket.emit('setMaxNumberOfPlayers', this.vm.room.maxNumberOfPlayer, this.vm.room.id);
    }

    existingPlayers() {
        return this.vm.players.filter(x => x !== undefined);
    }

    getStartTooltip() {
        if (this.existingPlayers().length < CONSTANTS.MIN_NUMBER_OF_PLAYERS) {
            return 'You need to be at least two players!';
        }
        if (this.vm.players.filter(x => x && x.type === PLAYER_TYPES.HUMAN).length <= 1) {
            return 'You need to be at least two human players. If you are just one human go for singleplayer instead.';
        }
        return '';
    }

    startGameIsDisabled() {
        return this.existingPlayers().length < CONSTANTS.MIN_NUMBER_OF_PLAYERS || this.vm.players.filter(x => x && x.type === PLAYER_TYPES.HUMAN).length <= 1;
    }

    startGame() {
        this.socketService.gameSocket.emit('startGame', this.vm.room.id);
    }
}

module.exports = LobbiesController;