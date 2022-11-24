import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	API_KEY: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('bot', 'Generate text with ai', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new PromptModal(this.app, this).open();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'generate-text-with-ai',
			name: 'Generate text with ai.',
			callback: () => {
				new PromptModal(this.app, this).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PromptModal extends Modal {
	plugin: MyPlugin;
	prompt: string;

	constructor(app: App, plugin: MyPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl, titleEl} = this;
		titleEl.setText("AI Prompt.");

    new Setting(contentEl)
      .setName("Prompt")
			.setDesc("Enter here your prompt for the AI.")
      .addTextArea((text) =>
        text.onChange((value) => {
          this.prompt = value
        }));

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Submit")
          .setCta()
          .onClick(() => {

						if(!this.plugin.settings.API_KEY) {
							new Notice("Error: No API_KEY");
							return;
						}

						const getResult = async () => {
							const body = {
								"model": "text-davinci-002",
								"prompt": this.prompt,
								"temperature": 0.7,
								"max_tokens": 256,
								"top_p": 1,
								"frequency_penalty": 0,
								"presence_penalty": 0
							}
							const headers = new Headers();
							headers.append("Authorization", `Bearer ${this.plugin.settings.API_KEY}`)
							headers.append("Content-Type", "application/json");

							const response = await fetch('https://api.openai.com/v1/completions', {
								method: "POST",
								headers,
								body: JSON.stringify(body),
							});

							const json = await response.json();
							return json;
						}

						getResult()
						.then((result) => {
							this.close();

							if (result.error) {
								new Notice(`Error: ${result.error.message}`);
							}

							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
	
							if (!view) return;
	
							const editor = view.editor;

							const text: string = result.choices[0].text;

							editor.replaceRange(text.trim(), editor.getCursor());

							new Notice(`Total token used: ${result.usage.total_tokens}`)
						})


          }));

	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'AI Text Generator Settings'});

		new Setting(containerEl)
			.setName('GPT-3 API KEY')
			.setDesc('You can get this key from https://beta.openai.com/account/api-keys.')
			.addText(text => text
				.setPlaceholder('Enter your api key')
				.setValue(this.plugin.settings.API_KEY)
				.onChange(async (value) => {
					this.plugin.settings.API_KEY = value;
					await this.plugin.saveSettings();
				}));
	}
}
