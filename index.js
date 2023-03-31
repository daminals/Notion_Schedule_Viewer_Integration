const { Client } = require('@notionhq/client');
const fs = require('fs');
const axios = require('axios');


// Load environment variables from .env file
require('dotenv').config();

// pastel colors
const colors = {
  "Pink": '#FFB7B2',
  "Orange": '#FFDAC1',
  "Green": '#E2F0CB',
  "Blue": '#B5EAD7',
  "Purple": '#C7CEEA',
  "Red": '#FF9AA2',
  "Yellow": '#FADF81',
  "Brown": '#E6C9A8',
  "Gray": '#CFCFCF',
};


// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_KEY });

async function notionScheduleBuilder(semesterName) {
  // Query Notion database for schedule information
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Semester',
          multi_select: {
            "contains": semesterName,
          },
        },
        {
          property: 'Schedule',
          title: {
            is_not_empty: true,
          },
        },
      ],
    },
  }).catch((err) => { 
    throw new Error(err);
  });

  if (response.results.length === 0) {
    console.log(`No schedules found for semester ${semesterName}`);
    return;
  }
  // Process schedules
  let schedule = createSchedule();
  const availableColors = Object.assign({}, colors);


  for (let i = 0; i < response.results.length; i++) {
    const { id, properties } = response.results[i];
    if (properties.Schedule.rich_text[0].plain_text == null) continue;

    // Extract schedule text from page properties
    const scheduleText = properties.Schedule.rich_text[0].plain_text;
    var scheduleList = [];
    if (scheduleText.includes(';')) {
      scheduleList = scheduleText.split(';');
      // Do something with the scheduleList
    } else {
      scheduleList.push(scheduleText);
    }
    const name = properties.Name.title[0].plain_text;
    // randomly select a color
    const colorKeys = Object.keys(availableColors);
    const randomKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    const color = availableColors[randomKey];

    // Remove the selected color from the available colors object
    delete availableColors[randomKey];
    // console.log(course, name, color);

    for (let j = 0; j < scheduleList.length; j++) {
      schedule = addCourseToSchedule(schedule, parseCourse(scheduleList[j]), name, "", color);
    }
  }
  return schedule;
}

// Define the box dimensions
const boxWidth = 120;
const boxHeight = 45;

function createSchedule(includeWeekends = false) {
  // Define the days of the week and hours of the day
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (!includeWeekends) {
    days.splice(5, 2);
  }
  const hours = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM'];

  // Define the SVG code template
  let svgTemplate = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1260" height="930">
  <!-- Draw the sidebar with days of the week -->
    ${days.map((day, index) => {
    // Calculate the box position
    const x = index * boxWidth + boxWidth;
    const y = 0;

    // Generate the box SVG code
    return `
      <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}"
        fill="white" stroke="black" />
      <text x="${x + boxWidth / 2}" y="${y + boxHeight / 2 + 5}"
        font-weight="bold" font-size="18" font-family="Verdana" text-anchor="middle">
        ${day}
      </text>`;
  }).join('')}
  
    <!-- Draw the sidebar with times -->
    ${hours.map((hour, index) => {
    // Calculate the box position
    const x = 0;
    const y = (index + 1) * boxHeight;

    // Generate the box SVG code
    return `
      <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}"
        fill="white" stroke="black" />
      <text x="${x + boxWidth / 2}" y="${y + boxHeight / 2 + 5}"
        font-weight="bold" font-size="20" text-anchor="middle" font-family="Verdana">
        ${hour}
      </text>`;
  }).join('')}
  
    <!-- Draw the schedule boxes -->
    ${days.map((day, index) => {
    return hours.map((hour, subIndex) => {
      // Calculate the box position
      const x = index * boxWidth + boxWidth;
      const y = (subIndex - 2) * boxHeight + boxHeight * 3;

      // Generate the box SVG code
      let svgCode = `
        <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}"
          fill="white" stroke="black" />
        <text x="${x + boxWidth / 2}" y="${y + boxHeight / 2 + 5}"
          font-weight="bold" font-size="20" text-anchor="middle" font-family="Verdana">
        </text>`;

      // Draw the boundaries for each day of the week
      if (subIndex > 0) {
        svgCode += `
          <line x1="${x}" y1="${y}" x2="${x + boxWidth}" y2="${y}"
            stroke="black" stroke-width="1" />
          <line x1="${x}" y1="${y}" x2="${x}" y2="${y + boxHeight}"
            stroke="black" stroke-width="1" />`;
      }

      return svgCode;
    }).join('');
  }).join('')}
  </svg>`;

  // Write the SVG code to a file
  // fs.writeFileSync('weekly_schedule.svg', svgTemplate);  
  return svgTemplate;
}

function removeLastLine(str) {
  const lastNewLineIndex = str.lastIndexOf('\n');
  if (lastNewLineIndex === -1) {
    // If there is no newline character, return the original string
    return str;
  }
  return str.substring(0, lastNewLineIndex);
}

function addCourseToSchedule(schedule, course, courseTitle, location, color) {
  const startX = 0; // Starting position of the schedule on x-axis
  const startY = boxHeight; // Starting position of the schedule on y-axis

  // Get the x position of the block based on the daysOfWeek array
  const xPos = {
    M: startX + boxWidth,
    T: startX + 2 * boxWidth,
    W: startX + 3 * boxWidth,
    TH: startX + 4 * boxWidth,
    F: startX + 5 * boxWidth,
  };
  // Parse the start and end times
  const schedStart = new Date(`January 1, 2023 08:00`);
  const start = new Date(`January 1, 2023 ${course.startTime}`);
  const end = new Date(`January 1, 2023 ${course.endTime}`);

  // Calculate the y position of the block based on the start time
  const hours = start.getHours() - 9;
  const minutes = start.getMinutes() / 60;
  // adjustedStartY should account for the schedule starting at 8AM
  // So if the time is at 6pm, the startY should be offset by boxheight * (18-8)
  const yPos = startY + (diff_hours(start, schedStart) * boxHeight);

  // Calculate the height of the block based on the start and end times
  const duration = diff_hours(end, start);
  const height = duration * boxHeight;
  schedule = removeLastLine(schedule);

  // Add the SVG elements to the schedule string
  for (let i = 0; i < course.daysOfWeek.length; i++) {
    const rect = `<rect x="${xPos[course.daysOfWeek[i]]}" y="${yPos}" width="${boxWidth}" height="${height}" fill="${color}" stroke="#000" />\n`;
    const title = `<text x="${xPos[course.daysOfWeek[i]] + 10}" y="${yPos + 20}" font-family="Verdana" font-size="16">${courseTitle}</text>\n`;
    const subheader = `<text x="${xPos[course.daysOfWeek[i]] + 10}" y="${yPos + 40}" font-family="Verdana" font-size="12">${location}</text>\n`;
    const box = rect + title + subheader
    schedule += '\n' + box;
  }

  schedule += `\n</svg>`;
  return schedule;
}

class Course {
  daysOfWeek;
  startTime;
  endTime;

  constructor(daysOfWeek, startTime, endTime) {
    this.daysOfWeek = daysOfWeek;
    this.startTime = startTime;
    this.endTime = endTime;
  }
}

function parseCourse(courseString) {
  const [daysOfWeekString, timeString] = courseString.split(": ");
  const daysOfWeek = daysOfWeekString.split("-");
  for (let i = 0; i < daysOfWeek.length; i++) {
    daysOfWeek[i] = daysOfWeek[i].trim();
    if (daysOfWeek[i] != "M" && daysOfWeek[i] != "T" && daysOfWeek[i] != "W" && daysOfWeek[i] != "TH" && daysOfWeek[i] != "F") {
      throw new Error(`Invalid course string: ${courseString}`);
    }
  }
  const timeRegex = /(\d+):(\d+)(AM|PM)-(\d+):(\d+)(AM|PM)/;
  const timeMatch = courseString.match(timeRegex);

  if (!timeMatch) {
    throw new Error(`Invalid course string: ${courseString}`);
  }
  const startTime = convertTimeTo24Hour(timeMatch[1], timeMatch[3], timeMatch[2]);
  const endTime = convertTimeTo24Hour(timeMatch[4], timeMatch[6], timeMatch[5]);

  return new Course(daysOfWeek, startTime, endTime);
}

function convertTimeTo24Hour(time, amOrPm, minutes) {
  let hour = parseInt(time);
  if (hour === 12) {
    hour = 0;
  }
  if (amOrPm === 'PM') {
    hour += 12;
  }
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function diff_hours(dt2, dt1) {
  var diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= (60 * 60);
  return Math.abs(parseFloat(diff.toFixed(2)));
}

async function uploadSvgToImgur(svg) {
  try {
    const response = await axios.post('https://api.imgur.com/3/upload', {
      image: svg,
      type: 'base64',
    }, {
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
      },
    });
    console.log("id:" + process.env.IMGUR_CLIENT_ID);

    if (response.status === 200 && response.data.success) {
      return response.data.data.link;
    } else {
      throw new Error('Unable to upload SVG to Imgur.');
    }
  } catch (error) {
    throw new Error(`Unable to upload SVG to Imgur: ${error.message}`);
  }
}


async function main() {
  let sched = createSchedule();
  sched = await notionScheduleBuilder("Fall 2023");

  fs.writeFileSync('weekly_schedule.svg', sched);
  uploadSvgToImgur(sched).then((link) => {
    console.log(link);
  }).catch((error) => {
    console.log(error);
  });
}

main();
