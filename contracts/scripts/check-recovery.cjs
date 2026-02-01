const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const LOST_ADDR = "0x240A2A6a11704618F20b0807099738aCeFe462D9".toLowerCase();
    const DEPLOYER_ADDR = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

    console.log(`Hunting for key for: ${LOST_ADDR}`);

    let foundWallet = null;

    // 1. Check process.env.PRIVATE_KEY
    if (process.env.PRIVATE_KEY) {
        try {
            const w = new hre.ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);
            if (w.address.toLowerCase() === LOST_ADDR) {
                console.log("✅ FOUND! It matches PRIVATE_KEY in .env");
                foundWallet = w;
            }
        } catch (e) { }
    }

    // 2. Check other env vars manually
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (val && val.trim().length > 60) { // likely a private key
                try {
                    const cleanVal = val.trim().replace(/"/g, '').replace(/'/g, '');
                    const w = new hre.ethers.Wallet(cleanVal, hre.ethers.provider);
                    if (w.address.toLowerCase() === LOST_ADDR) {
                        console.log(`✅ FOUND! It matches env var: ${key.trim()}`);
                        foundWallet = w;
                    }
                } catch (e) { }
            }
        });
    } catch (e) { console.log("Could not read .env file directly"); }

    // 3. Check known mnemonics
    const mnemonics = [
        "test test test test test test test test test test test junk", // Hardhat default
    ];

    for (const m of mnemonics) {
        for (let i = 0; i < 20; i++) {
            try {
                const wallet = hre.ethers.Wallet.fromPhrase(m).connect(hre.ethers.provider);
                // Derivation path default?
                // Actually, hardhat default is m/44'/60'/0'/0/i
                const derived = hre.ethers.HDNodeWallet.fromPhrase(m, undefined, "m/44'/60'/0'/0/" + i).connect(hre.ethers.provider);

                if (derived.address.toLowerCase() === LOST_ADDR) {
                    console.log(`✅ FOUND! Matches Hardhat Default Account #${i}`);
                    foundWallet = derived;
                    break;
                }
            } catch (e) { }
        }
        if (foundWallet) break;
    }

    if (foundWallet) {
        console.log("Attempting recovery transfer...");
        const bal = await hre.ethers.provider.getBalance(foundWallet.address);
        console.log(`Balance: ${hre.ethers.formatEther(bal)} ETH`);

        if (bal > 0n) {
            // Send all to deployer, minus gas
            // Estimate gas
            const feeData = await hre.ethers.provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            const gasLimit = 21000n; // Simple transfer
            const cost = gasLimit * gasPrice;
            const valueToSend = bal - cost;

            if (valueToSend > 0n) {
                console.log(`Sending ${hre.ethers.formatEther(valueToSend)} ETH to ${DEPLOYER_ADDR}...`);
                const tx = await foundWallet.sendTransaction({
                    to: DEPLOYER_ADDR,
                    value: valueToSend,
                    gasLimit: gasLimit,
                    gasPrice: gasPrice
                });
                console.log(`Recovery Tx Submitted: ${tx.hash}`);
                await tx.wait();
                console.log("✅ FUNDS RECOVERED SUCCESSFULLY!");
            } else {
                console.log("Balance too low to cover gas.");
            }
        } else {
            console.log("Wallet found but has 0 balance.");
        }
    } else {
        console.log("❌ Key NOT found in environment. Address likely generated externally or key lost.");
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
