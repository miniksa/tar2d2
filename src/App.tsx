import { useEffect, useState } from 'react'
// import reactLogo from './assets/react.svg'
import './App.css'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday';
import { classes, split, times } from './utils';
import { load_daysArray, load_includingFloating, load_startDate, persist_daysArray, persist_includingFloating, persist_startDate } from './State';
import IDaysArray from './DaysArray';

dayjs.extend(weekday);

// interface IData {
//   days: IDaysArray;
// }

function get_time_off(data: IDaysArray, day: dayjs.Dayjs): number {
  const str = day.toISOString();
  const result = data.find((v) => v.day_iso === str);
  if (result)
  {
    return result.hours;
  }

  return 0;
}

function set_time_off(data: IDaysArray, day: dayjs.Dayjs, hours: number): IDaysArray {
  const dayIso = day.toISOString();
  const index = data.findIndex((v) => v.day_iso === dayIso);
  if (index !== -1) {
    const clone = [...data];
    clone[index].hours = hours;
    return clone;
  }
  return [... data, { day_iso: dayIso, hours: hours }];
}

function App() {
  const [data, setData] = useState<IDaysArray>(load_daysArray());
  const [backup, setBackup] = useState<IDaysArray | null>(null);
  const [viewDate, setViewDate] = useState(dayjs().startOf("year"));
  useEffect(() => {
    persist_daysArray(data);
  }, [data]);
  const [startDate, setStartDate] = useState(load_startDate());
  useEffect(() => {
    persist_startDate(startDate);
  }, [startDate]);
  const [includeFloating, setIncludingFloating] = useState(load_includingFloating());
  useEffect(() => {
    persist_includingFloating(includeFloating);
  }, [includeFloating]);

  // TODO:
  const currentYear = viewDate.year();

  const getDaysForYearByMonth = (year: number): Array<{ month: number; monthD: dayjs.Dayjs, days: dayjs.Dayjs[] }> => {
    let day = dayjs(`${year}`, "YYYY");
    let yearArray = [];
    while (day.year() === year) {
      let currentMonth = day.month();
      let monthD = day;
      let days = [];
      while (day.month() === currentMonth) {
        days.push(day);
        day = day.add(1, 'day');
      }
      yearArray.push({
        month: currentMonth,
        monthD: monthD,
        days: days,
      });
    }
    return yearArray;
  };

  const isWeekend = (day: dayjs.Dayjs): boolean => {
    return day.day() === 0 || day.day() === 6;
  }

  const known_holidays = [
    dayjs("2023-01-02", "YYYY-MM-DD"),
    dayjs("2023-01-16", "YYYY-MM-DD"),
    dayjs("2023-02-20", "YYYY-MM-DD"),
    dayjs("2023-05-29", "YYYY-MM-DD"),
    dayjs("2023-06-04", "YYYY-MM-DD"),
    dayjs("2023-09-04", "YYYY-MM-DD"),
    dayjs("2023-11-23", "YYYY-MM-DD"),
    dayjs("2023-11-24", "YYYY-MM-DD"),
    dayjs("2023-12-25", "YYYY-MM-DD"),
    dayjs("2023-12-26", "YYYY-MM-DD"),
  ];

  const doesYearHaveHolidays = (year: number): boolean => {
    const found = known_holidays.find((h) => h.year() === year);
    return !!found;
  };

  // https://holidays.microsoft.com/
  const isHoliday = (day: dayjs.Dayjs): boolean => {
    // TODO.
    const isKnownHoliday = !!known_holidays.find((d) => d.isSame(day, "day"));
    return isKnownHoliday;
  }

  const isAlreadyOff = (day: dayjs.Dayjs): boolean => {
    return isWeekend(day) || isHoliday(day);
  }

  const usedHours = data.reduce((acc, v) => { return acc + v.hours }, 0);
  const usedDays = (usedHours / 8);

  const getYearsWorked = (startDate: dayjs.Dayjs) => { return dayjs().diff(startDate, "year"); };
  const getTotalHours = (startDate: dayjs.Dayjs) => {
    const years = getYearsWorked(startDate);
    if (years < 7) {
      return 120;
    } else if (years < 13) {
      return 160;
    } else {
      return 200;
    }
  };
  const totalHours = getTotalHours(dayjs(startDate, "YYYY-MM")) + (includeFloating ? 3 * 8: 0);
  const totalDays = (totalHours / 8);
  const remainingHours = totalHours - usedHours;
  const remainingDays = (remainingHours / 8);

  return (
    <>
      <div className='md:grid gap-4 md:grid-cols-[minmax(min-content,_30%)_1fr]'>
          <div>
            <div className='md:fixed top-10 flex flex-col gap-4'>
              <h1 className="text-3xl font-bold">TAR2-D2</h1>
              <p>A simple vacation tracker 🤖</p>

              <div>
                <button onClick={() => setViewDate(viewDate.add(-1, "year"))}>&larr;</button>
                <label>
                  Year:
                  <input type="year" value={viewDate.format("YYYY")} onChange={(e) => setViewDate(dayjs(e.target.value, "YYYY"))} />
                </label>
                <button onClick={() => setViewDate(viewDate.add(1, "year"))}>&rarr;</button>
                {(doesYearHaveHolidays(viewDate.year())) 
                  ? null
                  : <div className='bg-yellow-300'>I don't know about holidays for {viewDate.year()}!</div>
                }
              </div>

              <div>
                <label>
                  Start date:
                  <input type="month" value={startDate.format("YYYY-MM")} onChange={(e) => setStartDate(dayjs(e.target.value, "YYYY-MM"))} />
                </label>
                <span className='text-slate-400'>&rarr; {getYearsWorked(startDate)} years</span>
              </div>

              <table>
                {/* <thead>
                  <tr>
                    <th>&nbsp;</th>
                    <th>Days</th>
                    <th>Hours</th>
                  </tr>
                </thead> */}
                <tbody>
                  <tr>
                    <td className='text-right'>Used</td>
                    <td className='text-right'>{usedDays.toFixed(2)} days</td>
                    <td className="text-slate-400">{usedHours} hrs</td>
                  </tr>
                  <tr>
                    <td className='text-right'>Remaining</td>
                    <td className={classes([
                      "text-right",
                      (remainingHours < 0) ? "bg-red-200" : null,
                      (remainingHours > 0) ? "bg-emerald-300" : null,
                    ])}>{remainingDays.toFixed(2)} days</td>
                    <td className={classes([
                      "text-slate-400",
                      (remainingHours < 0) ? "bg-red-200" : null,
                      (remainingHours > 0) ? "bg-emerald-300" : null,
                    ])}>{remainingHours} hrs</td>
                  </tr>
                  <tr>
                    <td className='text-slate-400 text-right'>Total</td>
                    <td className='text-slate-400 text-right'>{totalDays.toFixed(2)} days</td>
                    <td className="text-slate-400">{totalHours} hrs</td>
                  </tr>
                </tbody>
              </table>

              <label>
                <input type="checkbox"
                  checked={includeFloating}
                  onChange={(e) => {
                    setIncludingFloating(e.target.checked);
                  }} />
                Include floating holidays <span className='text-slate-400'>(3 days/24 hours)</span>
              </label>

              <button onClick={() => {
                const hasBackup = backup !== null;
                if (hasBackup) {
                  setData(backup);

                  // TODO: backup any NEW data since the reset.
                  setBackup(null);
                } else {
                  setBackup(data);
                  setData([]);
                }
              }}>{(backup === null) ? "Reset data" : "Undo reset"}</button>
            </div>
          </div>

        <div className=''>
          <h2 className='font-bold text-3xl my-3'>{viewDate.year()}</h2>
          {/* <button>Reset {viewDate.year()}</button> */}

          {
            getDaysForYearByMonth(currentYear).map((m) => {
              const daysFromStartOfWeek = m.days[0].weekday();
              const daysFromEndOfWeek = 7 - m.days[m.days.length - 1].weekday();

              const weeks = split(7, [
                ... times(daysFromStartOfWeek, () => null),
                ... m.days,
                ... times(daysFromEndOfWeek, () => null)
              ]);

              return <div>
                <div>
                  <b>{m.monthD.format("MMMM")}</b>
                  {/* <button>Reset month</button> */}
                </div>
                {/* TODO: arrow keys, home and end, tab support */}
                {/* TODO: Support shift-click! */}
                {/* TODO: show one month before and after year? */}
                {/* TODO: explain holidays */}
                <table className='max-w-xs table-auto border-spacing-0 border-collapse'>
                  <thead>
                    <tr className=''>
                      {times(7, (i) => <th className='font-normal p-3 px-4 text-right text-slate-300' title={dayjs().weekday(i).format("dddd")} aria-label={dayjs().weekday(i).format("dddd")}>{dayjs().weekday(i).format("dd")}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((w) => {
                      return <tr className=''>
                        {w.map((d) => {
                          if (d === null) {
                            return <td>&nbsp;</td>;
                          }

                          const hasOff = get_time_off(data, d) !== 0;
                          const isAutomatic = isAlreadyOff(d);
                          const isToday = d.isSame(dayjs(), "day");
                          return <td className='p-0 m-0'>
                              <button className={classes([
                                'text-right rounded-none m-0 w-full p-3 px-4',
                                (hasOff) ? "bg-emerald-300 hover:bg-sky-400" : "hover:bg-sky-200 bg-inherit",
                                (isAutomatic) ? "text-slate-300" : null,
                                (isToday) ? "border-2 font-bold" : "border-0",
                                (isToday && hasOff) ? "border-emerald-500 hover:border-sky-700" : "border-slate-300 hover:border-sky-400"
                              ])}
                              disabled={isAutomatic}
                              onClick={() => {
                                if (!isAutomatic) {
                                  if (hasOff) {
                                    setData(set_time_off(data, d, 0));
                                  } else {
                                    setData(set_time_off(data, d, 8));
                                  }
                                }
                              }}>{d.date()}</button>
                            </td>;
                        })}
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>;
            })
          }
        </div>
      </div>

      <hr />

      <h2>Known vacations</h2>
      <ul>
        {known_holidays.map((d) => {
          return <li>{d.format("YYYY-MM-DD")}</li>;
        })}
      </ul>

      <h2>Accrual rates</h2>
      <p>(via <a href="https://microsoft.sharepoint.com/sites/HRweb/SitePages/FAQ_DTO.aspx">Discretionary Time Off (DTO) FAQ</a>)</p>
      <table>
        <thead>
          <tr>
            <th>Years of service</th>
            <th>Vacation grant rate (per pay period &times; 24)</th>
            <th>Maximum annual vacation granted</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0-6 yrs</td>
            <td>5.0 hrs</td>
            <td>15 days (120 hrs)</td>
          </tr>
          <tr>
            <td>7-12 yrs</td>
            <td>6.67 hrs</td>
            <td>20 days (160 hrs)</td>
          </tr>
          <tr>
            <td>13+ yrs</td>
            <td>8.34 hrs</td>
            <td>25 days (200 hrs)</td>
          </tr>
        </tbody>
      </table>
      {/* // Example: You are a full-time salaried employee, reaching your six-year
      // anniversary November 1, 2022. The next calendar day after the six-year
      // anniversary, November 2, 2022 (first day in your seventh year of
      // employment), you will move to the accrual rate of 6.67 hours per pay
      // period. This new accrual rate will be in effect for the last four pay
      // periods of 2022 (11/15, 11/30, 12/15, and 12/31). You would then be able to
      // carry over up to 160 hours of vacation into 2023. */}
    </>
  );
}

export default App
