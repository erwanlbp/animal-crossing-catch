import * as React from "react";
import RAW_FISH from "./fish.json";
import RAW_BUGS from "./bugs.json";
import moment from "moment";
import { css, injectGlobal } from "emotion";
import _ from "lodash";
import { ReactComponent as Location } from "./location.svg";
import { ReactComponent as Time } from "./time.svg";
import { ReactComponent as Bells } from "./bells.svg";
import { ReactComponent as Length } from "./length.svg";
import { ReactComponent as Warning } from "./warning.svg";

const PUBLIC_URL = process.env.PUBLIC_URL || "";

interface ICatchable {
  name: string;
  imageURL: string | null;
  sellPrice: number;
  location: string;
  months: boolean[];
  nhMonths: boolean[];
  shMonths: boolean[];
  hours: boolean[];
  timeString: string;
  leavingNextMonth: boolean;
}

interface Fish extends ICatchable {
  type: "fish";
  size: string;
}

interface Bug extends ICatchable {
  type: "bug";
}

type Catchable = Fish | Bug;

function cleanCatchable(input: { [key: string]: any }): ICatchable {
  const { name, imageURL, sellPrice, location, nhMonths, shMonths, time } = input;
  const hours = cleanTime(time);

  return {
    name,
    imageURL,
    sellPrice,
    location,
    months: nhMonths,
    nhMonths: nhMonths,
    shMonths: shMonths,
    hours,
    timeString: time,
    leavingNextMonth: false
  };
}

function cleanTime(time: string): boolean[] {
  let hours = new Array(24).fill(false);
  if (time.toLowerCase() === "all day") {
    hours.fill(true);
  } else {
    for (const timeStr of time.split(" & ")) {
      const [start, end] = timeStr.split(" - ").map(parseTimeString);
      forRangeWrap(start, end, 24, i => (hours[i] = true));
    }
  }

  return hours;
}

function cleanAFish(input: { [key: string]: any }): Fish {
  let catchable = cleanCatchable(input);
  return {
    ...catchable,
    type: "fish",
    size: input.size
  };
}

function cleanABug(input: { [key: string]: any }): Bug {
  let catchable = cleanCatchable(input);
  return {
    ...catchable,
    type: "bug"
  };
}

function parseTimeString(str: string): number {
  const m = moment(str, "HH A");
  return m.hour();
}

function forRangeWrap(
  start: number,
  end: number,
  cap: number,
  fn: (n: number) => void
): void {
  let i = start;
  while (i !== end) {
    if (i === cap) {
      i = 0;
    }
    fn(i);
    i++;
  }
}

const FISH: Catchable[] = RAW_FISH.map(cleanAFish);
const BUGS: Catchable[] = RAW_BUGS.map(cleanABug);

export default function App() {
  const catchables = useCurrentCatchables();
  const catchableMapper = (catchable: Catchable) => (
    <Card catchable={catchable} key={catchable.name} />
  );
  return (
    <>
      <div className={styles.root}>
        <Toggle
          dispatch={catchables.dispatch}
          selectedCatchable={catchables.state.selectedCatchable}
        />
        {catchables.rightNow && (
          <>
            <h1 className={styles.header}>Available Now</h1>
            {catchables.rightNow.map(catchableMapper)}
          </>
        )}
        {catchables.laterToday && (
          <>
            <h1 className={styles.header}>Available This Month</h1>
            {catchables.laterToday.map(catchableMapper)}
          </>
        )}
        {catchables.later && (
          <>
            <h1 className={styles.header}>Not Available</h1>
            {catchables.later.map(catchableMapper)}
          </>
        )}
      </div>
    </>
  );
}

function useCurrentCatchables(): {
  rightNow?: Catchable[];
  laterToday?: Catchable[];
  later?: Catchable[];
} & { state: State; dispatch: React.Dispatch<Action> } {
  const [currentTime, setCurrentTime] = React.useState(() => moment());
  const [state, dispatch] = React.useReducer(
    reducer,
    {
      selectedCatchable: "fish"
    },
    (state: State): State => {
      const storageValue = localStorage.getItem("selectedCatchable") as
        | "fish"
        | "bug"
        | null;
      return {
        ...state,
        selectedCatchable:
          storageValue != null ? storageValue : state.selectedCatchable
      };
    }
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(moment());
    }, 60000);
    return () => clearInterval(interval);
  }, [setCurrentTime]);

  React.useEffect(() => {
    localStorage.setItem("selectedCatchable", state.selectedCatchable);
  }, [state.selectedCatchable]);

  const catchables = _.chain(state.selectedCatchable === "fish" ? FISH : BUGS)
    .map(catchable => {
      let nextMonth = (currentTime.month() + 1) % 12;
      const leavingNextMonth =
        !catchable.months[nextMonth] && catchable.months[currentTime.month()];

      return { ...catchable, leavingNextMonth };
    })
    .orderBy(["leavingNextMonth", "name"], ["desc", "asc"])
    .groupBy(catchable => {
      if (
        catchable.hours[currentTime.hour()] &&
        catchable.months[currentTime.month()]
      ) {
        return "rightNow";
      }

      if (catchable.months[currentTime.month()]) {
        return "laterToday";
      }

      return "later";
    })
    .value() as {
    rightNow?: Catchable[];
    laterToday?: Catchable[];
    later?: Catchable[];
  };

  return { ...catchables, state, dispatch };
}

type State = { selectedCatchable: "fish" | "bug" };
type Action = { type: "select catchable"; catchable: "fish" | "bug" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select catchable": {
      return { ...state, selectedCatchable: action.catchable };
    }
  }
  return state;
}

function Toggle(props: {
  selectedCatchable: "fish" | "bug";
  dispatch: React.Dispatch<Action>;
}) {
  const root = css`
    display: flex;
    flex-direction: row;
    align-items: center;
    grid-column: 1/-1;
    margin-bottom: 16px;
    justify-content: center;
  `;
  const defaultStyle = css`
    font-size: 24px;
    text-align: center;
    width: 160px;
    color: ${colors.headerText};
    cursor: pointer;
  `;

  const selectedStyle = css`
    ${defaultStyle};
    ${styles.name};
  `;

  return (
    <div className={root}>
      <div
        className={
          props.selectedCatchable === "fish" ? selectedStyle : defaultStyle
        }
        onClick={() =>
          props.dispatch({ type: "select catchable", catchable: "fish" })
        }
      >
        Fish
      </div>
      <div
        className={
          props.selectedCatchable === "bug" ? selectedStyle : defaultStyle
        }
        onClick={() =>
          props.dispatch({ type: "select catchable", catchable: "bug" })
        }
      >
        Bugs
      </div>
    </div>
  );
}

function Card({ catchable }: { catchable: Catchable }) {
  const cardStyle = css`
    ${styles.card};
    ${catchable.type === "bug" ? styles.bug : null};
  `;
  return (
    <div className={cardStyle}>
      <img
        src={catchable.imageURL || imageFromName(catchable.name)}
        className={styles.img}
        alt={catchable.name}
      />

      <div className={styles.name} title={catchable.name}>
        {catchable.name}
      </div>
      <Row icon={<Location />}>{catchable.location}</Row>
      <Row icon={<Time />}>{catchable.timeString}</Row>
      <Row icon={<Bells />}>{catchable.sellPrice || "?"}</Row>
      {catchable.type === "fish" && (
        <Row icon={<Length />}>{catchable.size}</Row>
      )}
      {catchable.leavingNextMonth ? (
        <Row className={styles.leaving} icon={<Warning />}>
          Gone next month
        </Row>
      ) : null}
    </div>
  );
}

function imageFromName(name: string): string {
  const newName = name
    .toLowerCase()
    .replace(/ /g, "_")
    .replace("'", "");
  return `${PUBLIC_URL}/img/${newName}.png`;
}

function Row({
  icon,
  children,
  className
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const containerStyle = css`
    display: flex;
    flex-direction: row;
    font-size: 14px;
    align-items: center;
    ${className};
  `;

  const textStyle = css`
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  return (
    <div className={containerStyle}>
      {icon}
      <div className={textStyle}>{children}</div>
    </div>
  );
}

const colors = {
  fishBG: "#FFFAE3",
  text: "#805A2D",
  emText: "#DD1919",
  lightBG: "#CCE2CF",
  bugBG: "#FFFAE3",
  headerText: "#71997F"
};

const styles = {
  card: css`
    display: flex;
    flex-direction: column;
    padding: 16px;
    flex-grow: 1;
    min-width: 160px;
    background-color: ${colors.fishBG};
    border-radius: 6px;
    box-shadow: 0px 2px 15px rgba(170, 191, 172, 0.3);
    & > * {
      margin-bottom: 6px;
      :last-child {
        margin-bottom: 0;
      }
    }
  `,
  root: css`
    text-align: center;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    grid-gap: 4px 4px;
    justify-content: center;
    padding: 12px;
    width: 100%;
  `,
  leaving: css`
    color: ${colors.emText};
  `,
  header: css`
    grid-column: 1/-1;
    text-align: left;
    color: ${colors.headerText};
    margin: 16px 0;
  `,
  img: css`
    width: 64px;
    height: 64px;
    align-self: center;
    object-fit: scale-down;
  `,
  bug: css`
    background-color: ${colors.bugBG};
  `,
  name: css`
    font-weight: bold;
    align-self: stretch;
    background-color: ${colors.headerText};
    padding: 4px 8px;
    border-radius: 100px;
    color: ${colors.fishBG};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `
};

injectGlobal`
  body {
    margin: 0;
    background-color: ${colors.lightBG};
    color: ${colors.text};
    text-align: left;
    font-family: 'Nunito', sans-serif;
    width: 100%;
  }

  * {
    box-sizing: border-box;
  }
`;
