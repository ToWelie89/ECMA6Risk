import { worldMap } from './worldMapConfiguration';
import Region from './region';
import { shuffle } from './../helpers';

export default class WorldMap {
    constructor() {
        this.regions = new Map();

        //this.shuffleMap(worldMap);

        worldMap.regions.forEach(region => this.initializeRegion(region));
        console.log('World map regions: ');
        console.log(this.regions);
    }

    initializeRegion(region) {
        this.regions.set(region.name, (new Region(region)));
    }

    getTotalNumberOfTerritories() {
        let count = 0;
        this.regions.forEach(region => {
            region.territories.forEach(territory => {
                count++
            });
        });
        return count;
    }

    getAllTerritoriesAsList() {
        let arr = [];
        this.regions.forEach(region => {
            region.territories.forEach(territory => {
                arr.push(territory);
            });
        });
        return arr;
    }

    shuffleMap(map) {
        shuffle(map.regions); // First shuffle regions
        map.regions.forEach(region => shuffle(region.territories)); // Shuffle every territory in every region
    }
}