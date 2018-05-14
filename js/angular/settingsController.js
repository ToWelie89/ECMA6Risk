import {runningElectron} from './../helpers';

export default class SettingsController {

    constructor($scope, $timeout, settings, aiHandler, soundService) {
        this.vm = this;
        this.vm.settings = settings;
        this.aiHandler = aiHandler;
        this.soundService = soundService;

        this.vm.runningElectron = runningElectron();

        // PUBLIC FIELDS
        this.vm.movementSliderOptions = {
            showTicks: true,
            stepsArray: Object.keys(this.vm.settings.aiSpeedValues),
            onChange: () => {
                this.vm.settings.aiSpeed = this.vm.aiSpeed;
                this.aiHandler.update();
                this.soundService.changeColor.play();

                this.vm.settings.saveSettings();
            }
        };
        this.vm.aiSpeed = this.vm.settings.aiSpeed;

        // PUBLIC FUNCTIONS
        this.vm.toggleSound = this.toggleSound;
        this.vm.toggleAnnouncer = this.toggleAnnouncer;
        this.vm.toggleFullScreen = this.toggleFullScreen;
    }

    toggleSound() {
        if (this.vm.settings.playSound) {
            this.soundService.changeColor.play();
            this.vm.settings.toggleSound();
        } else {
            this.vm.settings.toggleSound();
            this.soundService.changeColor.play();
        }
    }

    toggleFullScreen() {
        this.vm.settings.fullScreen = !this.vm.settings.fullScreen;
        this.vm.settings.saveSettings();

        if (this.vm.settings.fullScreen) {
            //var electron = window.require('electron');
            //const { app } = require('electron').remote;
            //var window = app.getCurrentWindow();
            //window.setFullScreen(true);
        }
    }

    toggleAnnouncer() {
        this.vm.settings.showAnnouncer = !this.vm.settings.showAnnouncer;
        this.soundService.changeColor.play();

        this.vm.settings.saveSettings();
    }

}
