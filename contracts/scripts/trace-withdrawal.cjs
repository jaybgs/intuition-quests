const hre = require("hardhat");

async function main() {
    const addressesToCheck = [
        "0x240A2A6a11704618F20b0807099738aCeFe462D9",
        "0x9aD94f90588bBB82C11EE1518B291b5b6ceAEf02"
    ];
    const txHash = "0xc5a9411e05686f4eb09ed35e700933b7cbf54ee287c983f1dcab3e927ea7a817";

    console.log("Trace info:");
    console.log("----------------------------------------");

    // 1. Audit Addresses
    for (const addr of addressesToCheck) {
        console.log(`\n--- Checking ${addr} ---`);
        try {
            const code = await hre.ethers.provider.getCode(addr);
            const balance = await hre.ethers.provider.getBalance(addr);

            let codeLen = 0;
            if (code !== "0x") {
                codeLen = (code.length - 2) / 2;
            }

            console.log(`Code length: ${codeLen} bytes`);
            console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

            if (codeLen > 0) {
                console.log("✅ Contract code found.");
                const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
                const claimIQ = await ClaimIQ.attach(addr);
                try {
                    const owner = await claimIQ.owner();
                    console.log(`Owner: ${owner}`);
                } catch (e) { console.log("Could not fetch owner()"); }
                try {
                    const rev = await claimIQ.revenueWallet();
                    console.log(`Revenue Wallet: ${rev}`);
                } catch (e) { console.log("Could not fetch revenueWallet()"); }
            } else {
                console.log("⚠️  EOA (No code).");
            }
        } catch (e) {
            console.log(`Error checking address: ${e.message}`);
        }
    }

    // 2. Check Transaction
    console.log(`\nFetching transaction ${txHash}...`);
    const tx = await hre.ethers.provider.getTransaction(txHash);
    if (!tx) {
        console.log("Transaction not found.");
        return;
    }
    console.log(`Tx From: ${tx.from}`);
    console.log(`Tx To: ${tx.to}`);
    console.log(`Tx Value: ${hre.ethers.formatEther(tx.value)} ETH`);

    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    console.log(`Tx Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);

    // 3. Parse Logs
    console.log(`\nParsing Logs (${receipt.logs.length} found)...`);
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const iface = ClaimIQ.interface;

    receipt.logs.forEach((log) => {
        try {
            const parsed = iface.parseLog(log);
            if (parsed) {
                console.log(`[Event] ${parsed.name}`);
                if (parsed.name === 'FundsWithdrawn') {
                    console.log(`  >>> FUNDS SENT TO: ${parsed.args.to}`);
                    console.log(`  >>> Amount: ${hre.ethers.formatEther(parsed.args.amount)} ETH`);
                }
            }
        } catch (e) {
            // ignore
        }
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
