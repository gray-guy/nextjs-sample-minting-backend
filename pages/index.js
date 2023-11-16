import { createWeb3Modal, defaultConfig, useWeb3Modal, useWeb3ModalAccount } from '@web3modal/ethers5/react'
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../utils/contractInfo';
import { useEffect, useState } from 'react';

if (!process.env.WALLET_CONNECT_PROJECT_ID) {
  throw new Error('You need to provide WALLET_CONNECT_PROJECT_ID env variable')
}

if (!process.env.INFURA_URL) {
  throw new Error('You need to provide INFURA_URL env variable')
}

const m_chainId = 11155111;
const mainnet = {
  chainId: m_chainId,
  name: "Sepolia",
  currency: 'ETH',
  explorerUrl: "https://sepolia.etherscan.io",
  rpcUrl: process.env.INFURA_URL
}

const metadata = {
  name: 'Shadow War',
  description: 'Shadow War is a 5v5 competitive PvP action game for PC and Console. Fight online in a futuristic cyberpunk world.',
  url: 'https://shadowwar.com',
  icons: ['https://shadowwar.com/thumbnail.png']
}

const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet],
  projectId: process.env.WALLET_CONNECT_PROJECT_ID
})

export default function Home() {

  const { open } = useWeb3Modal()
  const { address, chainId, isConnected } = useWeb3ModalAccount()

  const [provider, setProvider] = useState();

  useEffect(() => {
    // HELPER FUNCTION THAT CAN BE CALLED ON PAGE LOAD IF REQUIRED TO LOAD DATA FROM CONTRACT BEFORE USER CONNECTS WALLET
    // loadAppDataBeforeConnecting()
  }, []);

  useEffect(() => {

    if (isConnected) {
      initialize()
    }
  }, [isConnected]);

  async function initialize() {
    console.log(address, chainId, isConnected)

    let walletProvider = modal.getWalletProvider()
    setProvider(walletProvider)

    modal.subscribeProvider(async ({ chainId }) => {

      if (isConnected) {
        console.log("Chain: ", chainId)
        if (chainId !== m_chainId) {
          await walletProvider.provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: toHex(m_chainId) }]
          });
          open()
        }
      }
      
    });
  }

  // HELPER FUNCTION THAT CAN BE CALLED ON PAGE LOAD IF REQUIRED TO LOAD DATA FROM CONTRACT BEFORE USER CONNECTS WALLET
  const loadAppDataBeforeConnecting = async () => {
    const temp_provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL)
    const tempInstance = new ethers.Contract(contractAddress, contractABI, temp_provider);

    tempInstance.functions.paused().then((response) => {
      let state = response[0];
      console.log("Contract Paused State: " + state);
    });

  }

  async function mint() {
    const contractInstance = new ethers.Contract(contractAddress, contractABI, provider.getSigner(address));
    const prices = await contractInstance.tiersCost();

    const proof = await getMerkleProofForAddress(address);
    // PROOF CHECK ELSE CANCEL

    const valueToSend = (prices.tier1 * 1) + (prices.tier2 * 0) + (prices.tier3 * 0);
    // VALUE CHECK WITH USER BALANCE ELSE CANCEL

    const mintParams = {tier1Amount: 1, tier2Amount: 0, tier3Amount: 0, address: address, proof: proof}
    await contractInstance.mint(mintParams, {
      from: address,
      value: valueToSend
    });
  }

  async function getMerkleProofForAddress(address) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      "type": "isWalletWhitelisted_test",
      "walletAddress": address
    });

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    return fetch("https://5ucas4o5xj4lcpdtkhccryebba0rptxf.lambda-url.us-east-1.on.aws/", requestOptions)
      .then(response => response.json())
      .then(result => result.body.proof)
      .catch(error => {
        console.log('error', error)
        return [];
      });
  }


  const toHex = (num) => {
    const val = Number(num);
    return "0x" + val.toString(16);
  };

  return (
    <main>
      <w3m-button />
      <button hidden={!isConnected} onClick={() => { mint() }}>Mint</button><br></br>
    </main>
  )
}

