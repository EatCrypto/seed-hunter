const { Wallet, utils, providers, Contract } = require("ethers");
const { shuffle } = require("lodash");
const fs = require("fs");
const WORDS = require("./words.json");
const multicallArtifact = require("./abi/multicall.json");
const { formatEther } = require("ethers/lib/utils");

const PROVIDER = new providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
);
const MULTICALL = new Contract(
  "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696",
  multicallArtifact.abi,
  PROVIDER
);

const run = async () => {
  let chunks = [];
  let words = WORDS;

  while (true) {
    try {
      words = shuffle(words);
      const mnemonic = words.slice(0, 12).join(" ");
      if (utils.isValidMnemonic(mnemonic)) {
        const wallet = Wallet.fromMnemonic(mnemonic);

        if (chunks.length < 2000) {
          chunks.push({
            mnemonic,
            address: wallet.address,
          });
        } else {
          const request = chunks.map((chunk) => ({
            target: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696",
            callData: MULTICALL.interface.encodeFunctionData("getEthBalance", [
              chunk.address,
            ]),
          }));

          const [, multicallResult] = await MULTICALL.aggregate(request);

          multicallResult.forEach((result, index) => {
            const balance = parseFloat(
              formatEther(
                MULTICALL.interface.decodeFunctionResult(
                  "getEthBalance",
                  result
                )[0]
              )
            );

            if (balance > 0) {
              console.log(chunks[index].mnemonic);
              fs.writeFileSync(
                `./data/${chunks[index].address}`,
                JSON.stringify(chunks[index])
              );
            }
          });
          chunks = [];
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};

run();
