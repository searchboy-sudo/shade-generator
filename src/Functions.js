import nearestColor from 'nearest-color';
import namedColors from 'color-name-list';

export const calcTextColor = rgb => {
  const lumRgb = rgb.map(el => {
    el = el / 255.000;
    return el <= 0.03928 ? el / 12.92 : Math.pow((el+0.055)/1.055, 2.4);
  });
  const lum = 0.2126 * lumRgb[0] + 0.7152 * lumRgb[1] + 0.0722 * lumRgb[2];
  let isDark = lum > Math.sqrt(1.05 * 0.05) - 0.05; // ~= 0.179
  return rgbToHex(...calculateGradient(rgb, isDark, 0.40));
}

// Uses the named-colors library for a list of named of colors
// and uses nearest color to match the entered color to the closest
// option with a name
export const getColorName = hex => {
  const colors = namedColors.reduce((o, { name, hex }) => Object.assign(o, { [name]: hex }), {});
  const nearest = nearestColor.from(colors);
  return nearest(hex).name;
}

export const rgbToHex = (r, g, b) => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
    
const componentToHex = c => {
  var hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

const parse = require('parse-color');

export const calcAllGradients = rgb => {
  let gradientArr = [];
  for (let opac = 90; opac >= 5; opac-=5) {
    gradientArr.push(parse(rgbToHex(...calculateGradient(rgb,false,opac/100))));
  }
  for (let opac = 5; opac <= 90; opac+=5) {
    gradientArr.push(parse(rgbToHex(...calculateGradient(rgb,true,opac/100))));
  }
  return gradientArr;
}

const calculateGradient = (colorVals, isDark, opacity) => {
  if (isDark) {
    return colorVals.map(val => calculateIndividualColor(val,0,opacity))
  } else {
    return colorVals.map(val => calculateIndividualColor(val,255,opacity))
  } 
}

const calculateIndividualColor = (color, bColor, opacity) => {
  return Math.round(opacity * bColor + (1 - opacity) * color);
}    