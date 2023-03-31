# Schedule Builder

This is a JavaScript project that allows you to create an SVG schedule with courses and timeslots, and integrate it with a Notion database.

## Installation

To use this project, you need to have Node.js and npm installed on your machine. Once you have these, you can clone the repository and run the following command to install the required packages:

```
yarn add package.json
```

## Usage

To use the Schedule Builder, you first need to create a Notion database with a text field called "Schedule". This field should contain the course times and information in the following format:

```
T-TH: 9AM-10AM
M-W-F: 1PM-2PM
```
Then you must connect the notion integration with your database, and with the page you'd like to update

You will also need to create a seperate page with toggles containing the name of the semester you'd like to generate a schedule for. For example, if you'd like to generate a schedule for Fall 2023, you would create a toggle called "Fall 2023". Set this page's id in your `.env` file as `NOTION_PAGE_ID`.

<img src='/assets/toggleExmple.png' width='500px' />

You can then use the following command to generate the schedule SVG:

```
node index.js
```

This will read your notion database (from your `NOTION_DATABASE_ID` key in `.env`) and pull any courses that have a schedule field with the associated semester (e.g. Fall 2023). It will then generate an SVG schedule with the courses and timeslots, convert it to a png, upload it to imgur, and then update Notion with the link to the image so that you are able to view your image.

<img src='/assets/Fall2023_Schedule.png' width='500px' />

## Customization

The project includes several customizable features, including:

- Custom colors for courses and timeslots
- Ability to add course descriptions
- Ability to set the time interval and start and end times for the schedule

## Credits

This project was created by Daniel Kogan