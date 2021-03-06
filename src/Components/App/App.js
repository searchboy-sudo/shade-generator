import React, { useState, useEffect, useContext } from 'react';
import { useOnline } from 'react-browser-hooks';
import ReactGA from 'react-ga';
import Header from '../Header';
import Sidebar from '../Sidebar';
import LoadingScreen from '../LoadingScreen';
import BodyContent from '../BodyContent';
import FirebaseContext from '../../Contexts/FirebaseContext';
import { InputUpdater } from '../../Contexts/InputContext';
import SplitViewContext from '../../Contexts/SplitViewContext';
import HistoryContext from '../../Contexts/HistoryContext';
import './App.scss';

// import ContrastRatio from "../ContrastRatio";

import {
  getAllColorInfo,
  getRandomColor,
  getCopy,
  attemptCreateColor,
  parseColorFromString
} from '../../Functions';

// returns [ hex1, hex2, isSplitScreen ]
function parseURL() {
  const path = window.location.pathname.slice(1);
  if (path.length) {
    const splitUrl = window.location.pathname
      .slice(1)
      .toUpperCase()
      .split('-');

    if (splitUrl.length === 1 && splitUrl[0].match(/^[0-9A-F]{6}$/)) {
      return [`#${splitUrl[0]}`, '', false];
    }
    if (
      splitUrl.length === 2 &&
      splitUrl[0].match(/^[0-9A-F]{6}$/) &&
      splitUrl[1].match(/^[0-9A-F]{6}$/)
    ) {
      return [`#${splitUrl[0]}`, `#${splitUrl[1]}`, true];
    }
    window.history.pushState({}, 'Shade Generator', '');
  }

  return ['', '', false];
}

const [initialHex1, initialHex2, initialSplitState] = parseURL();

const initialColor1 = getAllColorInfo(
  initialHex1.length ? attemptCreateColor(initialHex1) : getRandomColor()
);

const initialColor2 = getAllColorInfo(
  initialHex2.length ? attemptCreateColor(initialHex2) : getRandomColor()
);

let popCount = 2;

const App = () => {
  const online = useOnline();
  const [colorData1, setColorData1] = useState(initialColor1);
  const [colorData2, setColorData2] = useState(initialColor2);
  const [loading, setLoading] = useState(true);
  const [curInputVal1, setCurInputVal1] = useState(initialHex1);
  const [curInputVal2, setCurInputVal2] = useState(initialHex2);

  const { splitView, splitViewDisabled, setSplitView } = useContext(
    SplitViewContext
  );

  const { firebase } = useContext(FirebaseContext);

  useEffect(() => {
    if (online) {
      ReactGA.initialize(process.env.REACT_APP_GA_CODE);
      ReactGA.event({
        category: 'Connection',
        action: 'Connected to Shade Generator'
      });
    } else {
      console.log('offline detected');
    }

    setSplitView(initialSplitState);
    setLoading(false);
    // setTimeout(() => setLoading(false), 1000);
  }, [online, setSplitView]);

  const hex1 = colorData1.hex;
  const hex2 = colorData2.hex;

  // Update url when colors change or when split view
  useEffect(() => {
    if (!popCount) {
      if (splitView === true && !splitViewDisabled) {
        window.history.pushState(
          { hex1, hex2 },
          'Shade Generator',
          `${hex1.slice(1)}-${hex2.slice(1)}`
        );
      } else {
        window.history.pushState({ hex1 }, 'Shade Generator', hex1.slice(1));
      }
    } else {
      popCount -= 1;
    }
  }, [hex1, hex2, splitView, splitViewDisabled]);

  const { updateRecentColors } = useContext(HistoryContext);

  function addMenuItem(newColor) {
    const colorToAdd = { ...newColor };
    colorToAdd.timeAdded = new Date();
    colorToAdd.timeString = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: 'numeric'
    });
    colorToAdd.dateString = new Date().toLocaleDateString();

    updateRecentColors(colorToAdd);

    if (online) {
      const colorRef = firebase.db
        .collection('color-history')
        .doc(colorToAdd.hex);

      colorRef.get().then(colorRecord => {
        if (colorRecord.exists) {
          colorToAdd.count = (colorRecord.data().count || 0) + 1;
          colorRef.update(colorToAdd);
        } else {
          colorToAdd.count = 1;
          colorRef.set(colorToAdd);
        }
      });
    }
  }

  function updateStateValues(color, colorNum) {
    let colorData;
    if (typeof color === 'object') {
      if (color.shades && color.shades[0].contrastRatio) {
        colorData = color;
      } else {
        colorData = getAllColorInfo(color.hex);
      }
    } else if (typeof color === 'string') {
      colorData = getAllColorInfo(color);
    } else {
      return;
    }

    delete colorData.keyword;
    if (colorNum === 1) {
      setColorData1(colorData);
      setCurInputVal1(colorData.hex);
    } else if (colorNum === 2) {
      setColorData2(colorData);
      setCurInputVal2(colorData.hex);
    }

    addMenuItem(getCopy(colorData));
  }

  function getRandomColors() {
    ReactGA.event({
      category: 'Button Press',
      action: 'Random color button'
    });
    const randomColor1 = getAllColorInfo(getRandomColor());
    updateStateValues(randomColor1, 1);

    if (splitView && splitViewDisabled === false) {
      const randomColor2 = getAllColorInfo(getRandomColor());
      updateStateValues(randomColor2, 2);
    }
  }

  function handleSubmit(inputNum, inputVal) {
    const hex = parseColorFromString(inputVal);
    if (!hex) {
      return;
    }
    updateStateValues(hex, inputNum);
  }

  useEffect(() => {
    window.onpopstate = e => {
      popCount = 1;
      if (e?.state?.hex2) {
        popCount = 2;
      }

      updateStateValues(e?.state?.hex1, 1);
      if (e?.state?.hex2) {
        updateStateValues(e.state.hex2, 2);
        setSplitView(true);
      } else {
        setSplitView(false);
      }
    };
  });

  return (
    <div id="App" style={{ backgroundColor: colorData1.hex }}>
      <InputUpdater inputValue1={curInputVal1} inputValue2={curInputVal2} />
      <LoadingScreen show={loading} />
      <div className="main-container">
        <Header colorData={colorData1} getRandomColors={getRandomColors} />
        <Sidebar handleColorClick={updateStateValues} />
        <div className="page">
          <BodyContent
            handleSubmit={handleSubmit}
            colorData={colorData1}
            bodyNum={1}
            handleColorClick={updateStateValues}
          />
          {splitView && !splitViewDisabled && (
            <BodyContent
              handleSubmit={handleSubmit}
              colorData={colorData2}
              bodyNum={2}
              handleColorClick={updateStateValues}
            />
          )}
        </div>
        {/* <ContrastRatio hex1={hex1} hex2={hex2} /> */}
      </div>
    </div>
  );
};

export default App;
