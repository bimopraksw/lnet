const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const colors = require('colors');
const readline = require('readline');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

class Layernet {
    constructor(accountIndex, queryId, userData) {
        this.dataFilePath = path.join(__dirname, 'data.txt');
        this.baseURL = 'https://tongame-service-roy7ocqnoq-ew.a.run.app';
        this.ws = null;
        this.gameStarted = false;
        this.isRound2Active = false;
        this.claimingCoin = false;
        this.startingGame = false;
        this.gameCount = 1;
        this.maxGames = 50000; // Maximum number of games
        this.accountIndex = accountIndex;
        this.queryId = queryId;
        this.userData = userData;
    }

    log(msg) {
        console.log(`Akun-${this.accountIndex}: ${msg}`);
    }

    async getAccessToken() {
        const url = `${this.baseURL}/api/user/login`;
        const payload = {
            telegramId: this.userData.id,
            firstName: this.userData.first_name,
            lastName: this.userData.last_name,
            languageCode: this.userData.language_code,
            isVip: false
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.queryId}`,
                    'Origin': 'https://netcoin.layernet.ai',
                    'Referer': 'https://netcoin.layernet.ai/',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                }
            });

            if (response.data.success) {
                return response.data.data.accessToken;
            } else {
                throw new Error('Login failed');
            }
        } catch (error) {
            console.error('Error fetching access token:', error);
            throw error;
        }
    }

    async connectWebSocket(accessToken) {
        const wsURL = `${this.baseURL}/socket.io/?EIO=4&transport=websocket`;
        const headers = {
            'Origin': 'https://netcoin.layernet.ai',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        };

        this.ws = new WebSocket(wsURL, { headers });

        this.ws.on('open', () => {
            this.sendAuthMessage(accessToken);
        });

        this.ws.on('message', (message) => {
            this.handleMessage(message);
        });

        this.ws.on('close', () => {
            this.log(`Disconnected from server!`);
            this.resetGame();
        });

        this.ws.on('error', (error) => {
            console.error('Error connecting to server:', error);
        });
    }

    sendAuthMessage(accessToken) {
        const authMessage = JSON.stringify({ token: `Bearer ${accessToken}` });
        this.ws.send(`40${authMessage}`);
        setTimeout(() => this.sendHomeDataRequest(), 1000);
    }

    sendHomeDataRequest() {
        const homeDataRequest = JSON.stringify(["homeData"]);
        this.ws.send(`420${homeDataRequest}`);
    }

    handleMessage(message) {
        let messageStr = message.toString();
        const jsonMessageMatch = messageStr.match(/^\d+\[(\{.*\})\]$/);
        if (jsonMessageMatch) {
            try {
                const parsedMessage = JSON.parse(jsonMessageMatch[1]);
                if (parsedMessage[0] === "exception") {
                    const { message } = parsedMessage[1];
                    if (message === "Game not started" && this.isRound2Active) {
                        this.isRound2Active = false;
                        this.sendHomeDataRequest();
                        return;
                    }
                }
                this.processGameData(parsedMessage);
            } catch (error) {
                console.log(`Failed to parse message as JSON: ${error.message}`);
            }
        }
    }

    processGameData(data) {
        const { userRank, claimCountdown, gold, dogs } = data;
        if (userRank && claimCountdown) {
            const { role, profitPerHour } = userRank;
            const { minutes, seconds } = claimCountdown;
            const totalMinutesRemaining = minutes + (seconds / 60);
            if (!this.gameStarted && !this.claimingCoin && totalMinutesRemaining < 10) {
                this.claimCoin();
            }
            if (!this.startingGame) {
                setTimeout(() => this.startGame(), 3000);
            }

            this.log(`Restarting game (${this.gameCount}/${this.maxGames}) | Role: ${role} | Balance: ${gold} | DOGS: ${dogs}`);
        }
    }

    async claimCoin() {
        if (this.claimingCoin) {
            return;
        }
        this.claimingCoin = true;
        const withdrawClaimMessage = JSON.stringify(['withdrawClaim']);
        this.ws.send(`42${withdrawClaimMessage}`);
        setTimeout(() => {
            this.claimingCoin = false;
            this.sendHomeDataRequest();
        }, 2000);
    }

    async startGame() {
        if (this.startingGame) return;
        this.startingGame = true;
        const startGameMessage = JSON.stringify(["startGame"]);
        this.ws.send(`422${startGameMessage}`);

        this.gameStarted = true;
        this.isRound2Active = true;
        await this.playRound(1);
    }

    async playRound(roundNumber) {
        let bodem = 2;
        let messageCount = 0;
        const interval = setInterval(() => {
            if (messageCount < 60) {
                const inGameMessage = JSON.stringify(["inGame", { round: roundNumber, time: Date.now(), gameover: false }]);
                this.ws.send(`42${bodem}${inGameMessage}`);
                messageCount++;
                bodem++;
            } else {
                clearInterval(interval);
                if (roundNumber === 1) {
                    this.playRound2(2);
                }
            }
        }, 10000 / 60);
    }

    async playRound2(roundNumber) {
        let bodem = 63;
        let messageCount = 0;
        const interval = setInterval(() => {
            if (messageCount < 100) {
                if (this.isRound2Active) {
                    const inGameMessage = JSON.stringify(["inGame", { round: roundNumber, time: Date.now(), gameover: false }]);
                    this.ws.send(`42${bodem}${inGameMessage}`);
                    messageCount++;
                    bodem++;
                }
            } else {
                clearInterval(interval);
                if (this.isRound2Active) {
                    this.sendHomeDataRequest();
                    this.isRound2Active = false;
                    this.startingGame = false;
                    this.gameCount++;
                    if (this.gameCount < this.maxGames) {
                        setTimeout(() => this.startGame(), 1000);
                    } else {
                        this.ws.close();
                    }
                }
            }
        }, 50000 / 100);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Need to wait ${i} seconds to continue...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async resetGame() {
        this.gameStarted = false;
        this.isRound2Active = false;
        this.claimingCoin = false;
        this.startingGame = false;
        this.gameCount = 1;
        await this.waitWithCountdown(3);
        await this.start();
    }

    async start() {
        const accessToken = await this.getAccessToken();
        await this.connectWebSocket(accessToken);
        await new Promise(resolve => this.ws.on('close', resolve));
    }
}

if (require.main === module) {
    if (cluster.isMaster) {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'data.txt'), 'utf8')
                .replace(/\r/g, '')
                .split('\n')
                .filter(Boolean);

            if (data.length === 0) {
                throw new Error('data.txt is empty or not found.');
            }

            for (let index = 0; index < data.length; index++) {
                const queryIdLine = data[index];
                const queryParams = new URLSearchParams(queryIdLine);
                const userDataString = queryParams.get('user');

                if (!userDataString) {
                    console.log(`Account ${index + 1}/${data.length}: User data not found.`);
                    continue;
                }

                const userData = JSON.parse(decodeURIComponent(userDataString));

                if (!userData.id) {
                    console.log(`Account ${index + 1}/${data.length}: Invalid user ID.`);
                    continue;
                }

                cluster.fork({ ACCOUNT_INDEX: index + 1, QUERY_ID: queryIdLine, USER_DATA: JSON.stringify(userData) });
            }
        } catch (error) {
            console.error('Error during processing:', error);
        }
    } else {
        const accountIndex = process.env.ACCOUNT_INDEX;
        const queryId = process.env.QUERY_ID;
        const userData = JSON.parse(process.env.USER_DATA);
        const layernet = new Layernet(accountIndex, queryId, userData);
        layernet.start().catch(err => {
            console.error(err);
            process.exit(1);
        });
    }
}
