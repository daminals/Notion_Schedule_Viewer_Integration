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
    let courseTitle
    if (properties['Course Name'].rich_text[0] == undefined) {
      courseTitle = ""
    } else {
      courseTitle = properties['Course Name'].rich_text[0].plain_text;
    }
    // randomly select a color
    const colorKeys = Object.keys(availableColors);
    const randomKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    const color = availableColors[randomKey];

    // Remove the selected color from the available colors object
    delete availableColors[randomKey];
    // console.log(course, name, color);

    for (let j = 0; j < scheduleList.length; j++) {
      schedule = addCourseToSchedule(schedule, parseCourse(scheduleList[j]), name, courseTitle, color);
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
  <svg xmlns="http://www.w3.org/2000/svg" width="723" height="635">
  <!-- Draw the sidebar with days of the week -->
    <rect x="1" y="2" width="120" height="45" fill="#FeFeFe" stroke="black" />

    ${days.map((day, index) => {
    // Calculate the box position
    const x = index * boxWidth + boxWidth;
    const y = 2;

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
    const x = 1;
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
    const title = `<text x="${xPos[course.daysOfWeek[i]] + 5}" y="${yPos + 20}" font-family="Verdana" font-size="16">${courseTitle}</text>\n`;
    const subheader = `<text x="${xPos[course.daysOfWeek[i]] + 5}" y="${yPos + 35}" font-family="Verdana" font-size="8">${location}</text>\n`;
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

function encodeSvgToBase64(filePath) {
  const svgData = fs.readFileSync(filePath, 'utf8');
  const base64Data = Buffer.from(svgData).toString('base64');
  return base64Data;
}

// async function uploadSvgToImgur(svg) {
//   const base64Svg = Buffer.from(svg).toString('base64');
//     const config = {
//       headers: {
//         Authorization: `Bearer ${process.env.IMGUR_CLIENT_ID}`,
//         'Content-Type': 'application/json',
//       },
//     };
//     const payload = {
//       image: base64Svg,
//       type: 'base64',
//     };
//     try {
//       const response = await axios.post('https://api.imgur.com/3/upload', payload, config);
//       return response.data.data.link;
//     } catch (error) {
//       console.error(error);
//     }
// }

const sharp = require('sharp');
const { get } = require('https');

async function convertSvgToPng(svgData) {
  // Use Sharp to convert the SVG data to a PNG buffer
  const pngBuffer = await sharp(Buffer.from(svgData), { density: 300 })
    .resize({ width: 731, height: 631 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  // Return the PNG buffer
  return pngBuffer;
}

async function uploadImageToImgur(imagePath) {
  const image = fs.readFileSync(imagePath, 'base64');
  const response = await axios.post(
    'https://api.imgur.com/3/upload',
    {
      image: image,
      type: 'base64'
    },
    {
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  );
  const imageUrl = response.data.data.link;
  return imageUrl;
}



async function addImageToNotionPage(imageUrl, toggleBlockName) {
  const page = await notion.pages.retrieve({ page_id: process.env.NOTION_PAGE_ID }).catch((error) => {
    throw new Error(`Error retrieving page: ${error}`);
  });
  // https://www.notion.so/Create-Schedule-baf64f5ad9a54d01bf9ff0d459c1dab7?pvs=4#7c2569b06c384eb4bd3f8581ea329c25
  const toggleBlock = page.properties.toggle[0].items.find(
    (block) => block.type === 'toggle' && block.toggle.text[0].plain_text === toggleBlockName
  );

  if (!toggleBlock) {
    console.log(`Toggle block "${toggleBlockName}" not found.`);
    return;
  }

  // Add the image block as a child of the toggle block
  const imageBlock = {
    type: 'embed',
    embed: {
      url: imageUrl,
      caption: {
        text: [
          {
            type: 'text',
            text: {
              content: 'Image caption'
            }
          }
        ]
      }
    }
  };

  const children = toggleBlock.toggle.children || [];
  children.push(imageBlock);

  // Update the toggle block's children
  await notion.blocks.children.update({
    block_id: toggleBlock.id,
    children
  }).catch((error) => {
    throw new Error(error);
  });

  console.log(`Image added to toggle block "${toggleBlockName}".`);
}

async function getBlockChildren(blockId) {
  const response = await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50
  });

  const blockChildren = response.results;
  while (response.has_more) {
    response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: response.next_cursor,
      page_size: 50
    });
    blockChildren.push(...response.results);
  }

  // console.log(`Retrieved ${blockChildren.length} children of block with ID ${blockId}`);
  return blockChildren;
}


async function appendImageBlockToPage(imageUrl, pageID) {
  const headers = {
    'Notion-Version': '2022-03-16',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NOTION_KEY}`,
  };

  const blockData = {
    block_id: pageID,
    children: [
      {
        //...other keys excluded
        "type": "image",
        //...other keys excluded
        "image": {
          "type": "external",
          "external": {
            "url": imageUrl
          }
        }

      }]
  };
  // getBlockChildren(pageID);
  notion.blocks.children.append(blockData);
}


async function updateImageBlock(blockId, imageUrl) {
  const response = await notion.blocks.update({
    block_id: blockId,
    //...other keys excluded
    "type": "image",
    //...other keys excluded
    "image": {
      // "type": "external",
      "external": {
        "url": imageUrl
      }
    }
  });

  console.log(`Image block with ID ${blockId} updated`);
  return response;
}


async function getNotionChildren() {
  const response = await notion.blocks.children.list({
    block_id: process.env.NOTION_PAGE_ID,
    page_size: 50,
  });
  console.log(response.results[0].toggle.rich_text[0].text);
  return response.results;
}

async function updateToggleImg(toggleName, link) {
  const objects = await getNotionChildren();
  // search objects for toggle with name toggleName
  // if found, update image
  for (let i = 0; i < objects.length; i++) {
    // if rich text is in toggle
    if (objects[i].toggle == undefined || objects[i].toggle.rich_text == undefined) continue;
    if (objects[i].toggle.rich_text[0].text.content == toggleName) {
      // update image
      // console.log(objects[i].id);
      const block_children = await getBlockChildren(objects[i].id);
      if (block_children.length > 0) {
        // check if there is an image block
        for (let j = 0; j < block_children.length; j++) {
          // check if block_children has type attribute
          if (block_children[j] == undefined) continue;

          if (block_children[j].type == "image")
            return await updateImageBlock(block_children[j].id, link);
        }
      } 
        await appendImageBlockToPage(link, objects[i].id);
    }
  }
}

async function main() {
  let sched = createSchedule();
  const semester = "Fall 2023";
  sched = await notionScheduleBuilder(semester);

  fs.writeFileSync('assets/weekly_schedule.svg', sched);

  // Convert the SVG to PNG
  await convertSvgToPng(sched)
    .then(pngBuffer => {
      // Write the PNG buffer to a file
      fs.writeFileSync('assets/weekly_schedule.png', pngBuffer);
    })
    .catch(error => {
      console.error(error);
    });
  await uploadImageToImgur('assets/weekly_schedule.png').then((link) => {
    console.log(link);
    schedule_link = link;
  }).catch((error) => {
    throw new Error(error);
  });

  if (schedule_link == 0) {
    throw new Error("Schedule link is not set");
  }
  await updateToggleImg(semester, schedule_link);
}

main();

