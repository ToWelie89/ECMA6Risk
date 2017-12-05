/*
* IMPORTS
*/

import MainController from './angular/mainController';
import GameController from './angular/gameController';
import GameSetupController from './angular/gameSetupController';
import AttackModalController from './angular/attackModalController';
import MovementModalController from './angular/movementModalController';
import CardTurnInModalController from './angular/cardTurnInModalController';
import ColorPopoverController from './angular/colorPopoverController';
import AvatarPopoverController from './angular/avatarPopoverController';
import TurnPresentationController from './angular/turnPresentationController';
import SettingsController from './angular/settingsController';
import SoundService from './sound/soundService';
import TutorialService from './tutorial/tutorialService';
import MapService from './map/mapService';
import Settings from './settings/settings';
import AiHandler from './ai/aiHandler';
import GameEngine from './gameEngine';
import GameAnnouncer from './voice/gameAnnouncer';
import WavingFlagDirective from './directives/wavingFlagDirective';

const app = angular.module('risk', ['rzModule', 'ui.bootstrap', 'ngSanitize']);

/* MAIN GAME ENGINE */
app.service('gameEngine', GameEngine);
/* CONTROLLERS */
app.controller('mainController', MainController);
app.controller('gameController', GameController);
app.controller('gameSetupController', GameSetupController);
app.controller('attackModalController', AttackModalController);
app.controller('movementModalController', MovementModalController);
app.controller('cardTurnInModalController', CardTurnInModalController);
app.controller('colorPopoverController', ColorPopoverController);
app.controller('avatarPopoverController', AvatarPopoverController);
app.controller('turnPresentationController', TurnPresentationController);
app.controller('settingsController', SettingsController);
/* SERVICES */
app.service('soundService', SoundService);
app.service('mapService', MapService);
app.service('gameAnnouncerService', GameAnnouncer);
app.service('tutorialService', TutorialService);
app.service('aiHandler', AiHandler);
app.service('settings', Settings);
/* DIRECTIVES */
app.directive('wavingFlag', () => new WavingFlagDirective());