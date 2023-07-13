import { existsSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import asar from "@electron/asar";
import { readFile, rm, writeFile } from "fs/promises";

const getUserInput = (question: string): Promise<string> => {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve, reject) => {
		rl.question(question, (answer) => {
			resolve(answer);
			rl.close();
		});
	});
};

const tryGetParsifyPath = async (): Promise<string> => {
	let appDataPath =
		// Windows
		process.env.LOCALAPPDATA ||
		// macOS
		(process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share");

	// First, check if it exists in the appdata path
	let parsifyPath = join(appDataPath, "Programs", "@parsifydesktop");

	if (existsSync(parsifyPath)) {
		return parsifyPath;
	}

	parsifyPath = await getUserInput("Please enter the path to Parsify: ");

	let maxTries = 5;
	let tries = 0;

	// If the path doesn't exist, keep prompting the user for the path
	// until they enter a valid one
	while (!existsSync(parsifyPath)) {
		parsifyPath = await getUserInput("Please enter the path to Parsify: ");

		tries++;

		if (tries >= maxTries) {
			throw new Error("Max tries exceeded");
		}
	}

	return parsifyPath;
};

// Find the

const main = async () => {
	console.log("Parsify Desktop License Patch by @Groovin-Dev");

	console.log("Finding Parsify...");

	// Get the path to Parsify
	const parsifyPath = await tryGetParsifyPath();

	console.log("Loading ASAR...");

	// Locate the app.asar file
	const appAsarPath = join(parsifyPath, "resources", "app.asar");

	// If the app.asar file doesn't exist, throw an error
	if (!existsSync(appAsarPath)) {
		throw new Error("app.asar not found");
	}

	let tempPath = join(parsifyPath, "TEMP");

	// If the TEMP folder doesn't exist, create it
	if (!existsSync(tempPath)) {
		await asar.extractAll(appAsarPath, tempPath);
	}

	console.log("Extracting ASAR...");

	// Extract the app.asar file
	await asar.extractAll(appAsarPath, tempPath);

	// Find the app/background.js file
	const backgroundPath = join(tempPath, "app", "background.js");

	// If the background.js file doesn't exist, throw an error
	if (!existsSync(backgroundPath)) {
		throw new Error("background.js not found");
	}

	console.log("Modifying background.js...");

	// Read the background.js file
	let backgroundFile = await readFile(backgroundPath, "utf-8");

	// Replace the string
	backgroundFile = backgroundFile.replace("(await(0,n.fetcher)(`https://api.parsify.app/api/status/${t}`)).valid", "true");

	// Write the file
	await writeFile(backgroundPath, backgroundFile);

	console.log("Rebuilding ASAR...");

	// Rebuild the app.asar file
	await asar.createPackage(tempPath, appAsarPath);

	// Delete the TEMP folder
	await rm(tempPath, { recursive: true });

	console.log("Done!");
};

main();
