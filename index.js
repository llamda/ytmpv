import blessed from 'blessed';
import fs from 'fs';
import open from 'open';

const config = JSON.parse(fs.readFileSync('config.json').toString());
let searchResults = [];

const screen = blessed.screen({
	smartCSR: true,
	ignoreLocked: ['escape', 'C-c', '/'],
	fullUnicode: true,
});

const box = blessed.box({
	tags: true,
	shrink: true,
	width: '100%',
	label: '{cyan-fg}Search{/cyan-fg}',
	border: 'line',
});

const list = blessed.list({
	top: 1,
	tags: true,
	keys: true,
	vi: true,
	width: '100%-3',
	height: 25,
	style: {
		selected: {
			bg: 'red',
		},
	},
	items: [],
});

const prompt = blessed.textbox({
	top: 0,
	shrink: true,
	keys: true,
	vi: true,
	width: '100%-2',
	style: {
		fg: 'green',
		focus: {
			fg: 'black',
			bg: 'white',
		},
	},
});

prompt.on('submit', async query => {
	await search(query);

	let displayItems = searchResults.map(video => {
		let v = video.snippet;

		let channel = v.channelTitle;
		let title = decodeURI(v.title)
			.substring(0, screen.width - (channel.length + 6))
			.trim()
			.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

		title =  blessed.escape(title);
		return ` ${title}{|}[{yellow-fg}${v.channelTitle}{/}]`;
	});

	list.setItems(displayItems);
	list.select(0);
	list.focus();
	screen.render();
});

screen.key(['/'], () => {
	list.clearItems();
	prompt.focus();
	prompt.readInput();
	prompt.clearValue();
	screen.render();
});

list.on('select', (el, selected) => {
	const index = list.getItemIndex(selected);

	let video = searchResults[index];
	let code = video.id.videoId;
	let url = 'https://www.youtube.com/watch?v=' + code;

	open(url, { app: { name: 'mpv'} });
});


screen.key(['escape', 'C-c'], () => {
	process.exit(0);
});


box.append(list);
box.append(prompt);
screen.append(box);

prompt.focus();
prompt.readInput();
screen.render();


async function search(query) {
	const url = 'https://youtube.googleapis.com/youtube/v3/search?';
	const params = new URLSearchParams({
		'part': 'snippet',
		'maxResults': 25,
		'q': query,
		'key': config.key,
	}).toString();

	let response = await fetch(url + params);
	let json = await response.json();

	searchResults = json.items;
	return Promise.resolve();
}
