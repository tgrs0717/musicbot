"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const text_1 = require("./text");
const express_1 = __importDefault(require("express"));
// Expressサーバーの設定
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => {
    res.send('Hello from Render with Express + TypeScript!');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Load environment variables
dotenv.config();
// Discordボットのトークン
const BOT_TOKEN = process.env.DISCORD_TOKEN;
if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not defined in the environment variables.');
}
// text.ts の初期化
(0, text_1.initializeTextBot)(BOT_TOKEN);
console.log('Bot is running...');
// Discordクライアントの拡張クラス
class ExtendedClient extends discord_js_1.Client {
    commands;
    constructor(options) {
        super(options);
        this.commands = new discord_js_1.Collection();
    }
}
// Discordクライアントの作成
const client = new ExtendedClient({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildVoiceStates],
});
// コマンドファイルの読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const command = commandModule.default || commandModule;
    if (Array.isArray(command.data)) {
        for (const builder of command.data) {
            client.commands.set(builder.name, {
                ...command,
                data: builder,
            });
        }
    }
    else if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
    else {
        console.warn(`⚠️ コマンドファイル "${file}" に data または execute が存在しません`);
    }
}
// ボット起動時のログ
client.once('ready', () => {
    console.log(`✅ Botとしてログインしました: ${client.user?.tag}`);
});
// コマンド実行処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ 未登録のコマンド: ${interaction.commandName}`);
        return;
    }
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(`❌ コマンド "${interaction.commandName}" 実行時にエラー発生:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                content: '⚠️ コマンド実行中にエラーが発生しました。',
            });
        }
        else {
            await interaction.reply({
                content: '⚠️ コマンド実行中にエラーが発生しました。',
                ephemeral: true,
            });
        }
    }
});
// トークンでログイン
client.login(process.env.DISCORD_TOKEN);
