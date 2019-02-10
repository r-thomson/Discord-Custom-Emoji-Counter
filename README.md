A bot for [Discord](https://discordapp.com) that counts the usage of custom emojis. Built with [Discord.js](https://discord.js.org/).

## Setup

1. Clone the project and install dependencies  with `npm install`
2. Create a `config.json` file in the project directory. The format for this file is as follows.

```
{
    "token": "your bot token",
    "messageLimit": 5000
}
```

The environment variable `TOKEN` will be used if the token is not specified in `config.json`

3. Start the bot with `npm start`

## Usage

To invoke the bot on a server, just @mention the bot while it is running. 

The bot can only scan for messages on channels that it has permission to read.
