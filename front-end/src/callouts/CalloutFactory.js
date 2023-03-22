import CalloutBuilder from "./CalloutBuilder";
import CalloutBuilderMock from "./CalloutBuilderMock";
import Constants from '../Constants';

let calloutBuilder = Constants.MOCK_API ? new CalloutBuilderMock : new CalloutBuilder();

export function getSchedule(key){
    return calloutBuilder.getSchedule(key);
}

export function getPowerRankings(key){
    return calloutBuilder.getPowerRankings(key);
}

export function getBoardGameGeekIds(key){
    return calloutBuilder.getBoardGameGeekIds(key);
}
