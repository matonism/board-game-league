import { useEffect, useState } from "react";
import './Calendar.css';

const Calendar = props => {

    const months=["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; // array of month names

    const [month, setMonth] = useState(props.startingDate ? props.startingDate.getMonth() : new Date().getMonth());
    const [date, setDate] = useState(props.startingDate ? props.startingDate : new Date());
    const [year, setYear] = useState(props.startingDate ? props.startingDate.getFullYear() : new Date().getFullYear());

    function handleMonthChange(event){
        // When an icon is clicked
        // Check if the icon is "calendar-prev" or "calendar-next"
        setMonth(event.currentTarget.id==="calendar-prev" ? month - 1 : month + 1);

        // Check if the month is out of range
        if (month < 0 || month > 11) {
            // Set the date to the first day of the month with the new year
            setDate(new Date(year, month, new Date().getDate()));
            // Set the year to the new year
            setYear(date.getFullYear());
            // Set the month to the new month
            setMonth(date.getMonth());
        }else {
            // Set the date to the current date
            setDate(new Date());
        }
    }

    function getCalendarUI(){

        // let date = new Date(); // creates a new date object with the current date and time
        // let year = date.getFullYear(); // gets the current year
        // let month = date.getMonth(); // gets the current month (index based, 0-11)


        // get the first day of the month
        let dayone = new Date(year, month, 1).getDay();
                
        // get the last date of the month
        let lastdate = new Date(year, month + 1, 0).getDate();

        // get the day of the last date of the month
        let dayend = new Date(year, month, lastdate).getDay();

        // get the last date of the previous month
        let monthlastdate = new Date(year, month, 0).getDate();

        let lit = []; // variable to store the generated calendar HTML

        let dateWindow = props.week.dates.split('-');
        let windowStart;
        let windowEnd;

        if(dateWindow.length > 1){
            windowStart = new Date(props.week.dates.split('-')[0].trim() + '/' + props.season)
            windowEnd = new Date(props.week.dates.split('-')[1].trim() + '/' + props.season);
        }
        // loop to add the last dates of the previous month
        for (let i = dayone; i > 0; i--) {
            let currentDate = new Date((month) + '/' + (monthlastdate - i + 1) + '/' + year);
            let isInWindow = windowStart && currentDate >= windowStart && currentDate <= windowEnd ? "game-window-date": "inactive";
            lit.push(<li class={isInWindow}>{monthlastdate - i + 1}</li>);
        }

        // loop to add the dates of the current month
        for (let i=1; i <=lastdate; i++) {
            let currentDate = new Date((month+1) + '/' + i + '/' + year);

            let isInWindow = windowStart && currentDate >= windowStart && currentDate <= windowEnd ? "game-window-date": "";
            let isToday=i===date.getDate() && month===new Date().getMonth() && year===new Date().getFullYear() ? "active-date": "";

            lit.push(<li class={isInWindow + ' ' + isToday}>{i}</li>);
        }
        

        // loop to add the first dates of the next month
        for (let i=dayend; i < 6; i++) {
            let currentDate = new Date((month+2) + '/' + (i - dayend + 1) + '/' + year);
            let isInWindow = windowStart && currentDate >= windowStart && currentDate <= windowEnd ? "game-window-date": "inactive";
            lit.push(<li class={isInWindow}>{i - dayend + 1}</li>)
        }

        return (
            <div class="calendar-container">
                <header class="calendar-header">
                    <div class="calendar-current-date">{months[month] + ' ' + year}</div>
                    <div class="calendar-navigation">
                        <span id="calendar-prev" class="material-symbols-rounded" onClick={handleMonthChange}>&lt;</span>
                        <span id="calendar-next" class="material-symbols-rounded" onClick={handleMonthChange}>&gt;</span>
                    </div>
                </header>
                <div class="calendar-body">
                    <ul class="calendar-weekdays">
                        <li>Sun</li>
                        <li>Mon</li>
                        <li>Tue</li>
                        <li>Wed</li>
                        <li>Thu</li>
                        <li>Fri</li>
                        <li>Sat</li>
                    </ul>
                    <ul class="calendar-dates">{lit}</ul>
                </div>
            </div>
        );

        // update the text of the current date element with the formatted current month and year
        // currdate.innerText=`${months[month]} ${year}`;

        // update the HTML of the dates element with the generated calendar
        // day.innerHTML = lit;
    }

    return getCalendarUI();
}

export default Calendar;