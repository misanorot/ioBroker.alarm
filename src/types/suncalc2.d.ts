declare module 'suncalc2' {
    interface GetTimesResult {
        sunrise: Date;
        sunriseEnd: Date;
        goldenHourEnd: Date;
        solarNoon: Date;
        goldenHour: Date;
        sunsetStart: Date;
        sunset: Date;
        dusk: Date;
        nauticalDusk: Date;
        night: Date;
        nadir: Date;
        nightEnd: Date;
        nauticalDawn: Date;
        dawn: Date;
        [key: string]: Date;
    }

    function getTimes(date: Date, latitude: number, longitude: number): GetTimesResult;

    export default { getTimes };
    export { getTimes, type GetTimesResult };
}
