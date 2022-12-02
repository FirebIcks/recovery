import type { NextPageWithLayout } from "./_app";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { pki, md } from "node-forge";
import { generateRsaKeypairInput } from "../lib/schemas";
import { Layout } from "../components/Layout";
import { TextField } from "../components/TextField";
import { NextLinkComposed } from "../components/Link";
import { Button } from "../components/Button";
import {
  Box,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
} from "@mui/material";

type InternetConnectionState = "connected" | "disconnected" | "waiting";

type FormData = z.infer<typeof generateRsaKeypairInput>;

type KeypairUris = {
  privateKeyUri: string;
  publicKeyUri: string;
  checksumUri: string;
};

const createBlobDataUri = (content: string) =>
  URL.createObjectURL(new Blob([content]));

const generateRsaKeypairUris = (formData: FormData) =>
  new Promise<KeypairUris>((resolve, reject) =>
    pki.rsa.generateKeyPair({ bits: 4096, workers: 2 }, (err, keypair) => {
      if (err) {
        reject(err);
      }

      const { privateKey, publicKey } = keypair;

      let privateKeyPem: string | undefined;

      if (formData.passphrase) {
        privateKeyPem = pki.encryptRsaPrivateKey(privateKey, "password", {
          algorithm: "aes128",
        });
      }

      privateKeyPem = pki.privateKeyToPem(privateKey);

      const publicKeyPem = pki.publicKeyToPem(publicKey);

      const md5 = md.md5.create();

      md5.update(publicKeyPem);

      const checksum = md5.digest().toHex();

      const privateKeyUri = createBlobDataUri(privateKeyPem);
      const publicKeyUri = createBlobDataUri(publicKeyPem);
      const checksumUri = createBlobDataUri(checksum);

      resolve({
        privateKeyUri,
        publicKeyUri,
        checksumUri,
      });
    })
  );

const Backup: NextPageWithLayout = () => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [internetConnectionState, setInternetConnectionState] =
    useState<InternetConnectionState>("waiting");

  const [rsaKeypairUris, setRsaKeypairUris] = useState<KeypairUris | null>(
    null
  );

  const downloadedFilesCount = useRef(0);

  const machineSetupColor =
    internetConnectionState === "waiting"
      ? "primary"
      : internetConnectionState === "connected"
      ? "error"
      : "success";

  useEffect(() => {
    setTimeout(() => {
      setActiveStep(2);
      setInternetConnectionState(
        navigator.onLine ? "connected" : "disconnected"
      );
    }, 1000);
  }, []);

  const onGenerateRsaKeypair = async (formData: FormData) => {
    const uris = await generateRsaKeypairUris(formData);

    setRsaKeypairUris(uris);
  };

  const onDownload = () => {
    downloadedFilesCount.current += 1;

    if (downloadedFilesCount.current === 1) {
      setActiveStep(3);
    }

    if (downloadedFilesCount.current === 3) {
      setActiveStep(4);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(generateRsaKeypairInput),
  });

  return (
    <Box
      component="form"
      height="100%"
      display="flex"
      flexDirection="column"
      onSubmit={handleSubmit(onGenerateRsaKeypair)}
    >
      <Typography variant="h1">Recovery Setup</Typography>
      <List sx={{ width: "100%" }} dense disablePadding>
        <ListItem sx={{ alignItems: "flex-start" }}>
          <ListItemAvatar>
            <Avatar
              sx={{
                background: (theme) => theme.palette[machineSetupColor].main,
              }}
            >
              {internetConnectionState === "waiting" ? (
                <CircularProgress color="inherit" size="24px" />
              ) : (
                1
              )}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Set up the offline recovery machine."
            primaryTypographyProps={{ variant: "h2" }}
            secondary={
              <>
                Ensure that this dedicated recovery machine is:
                <ol>
                  <li>
                    <Typography
                      color={machineSetupColor}
                      fontWeight={
                        internetConnectionState === "connected"
                          ? 600
                          : undefined
                      }
                    >
                      Offline and air-gapped.{" "}
                      {internetConnectionState === "connected" &&
                        "This machine is connected to the internet."}
                    </Typography>
                  </li>
                  <li>Accessible only by necessary, authorized personnel,</li>
                  <li>Protected with a very strong password,</li>
                  <li>Encrypted on all partitions,</li>
                  <li>And stored in a safe box when not in use.</li>
                </ol>
              </>
            }
          />
        </ListItem>
        <ListItem sx={{ alignItems: "flex-start" }}>
          <ListItemAvatar>
            <Avatar
              sx={{
                background: (theme) =>
                  activeStep === 2 ? theme.palette.primary.main : undefined,
              }}
            >
              2
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Generate the recovery keypair and checksum."
            primaryTypographyProps={{ variant: "h2" }}
            secondary="The recovery keypair is used for encrypting Fireblocks key shares and decrypting them in an offline environment. The checksum is used to verify the integrity of the recovery public key."
          />
        </ListItem>
        <ListItem sx={{ paddingLeft: "4.5rem" }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                id="rsaKeyPassphrase"
                type="password"
                label="RSA Key Passphrase"
                error={errors.passphrase?.message}
                disabled={activeStep < 2}
                {...register("passphrase")}
              />
            </Grid>
            <Grid item xs={6}>
              <Button
                type="submit"
                color="primary"
                fullWidth
                disabled={activeStep < 2}
              >
                Generate Recovery Keypair
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                color="error"
                fullWidth
                disabled={!rsaKeypairUris}
                onClick={onDownload}
                component="a"
                href={rsaKeypairUris?.privateKeyUri ?? ""}
                download="fb-recovery-prv.pem"
              >
                Download Private Key
              </Button>
            </Grid>
          </Grid>
        </ListItem>
        <ListItem sx={{ alignItems: "flex-start" }}>
          <ListItemAvatar>
            <Avatar
              sx={{
                background: (theme) =>
                  activeStep === 3 ? theme.palette.primary.main : undefined,
              }}
            >
              3
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Send the recovery public key to Fireblocks."
            primaryTypographyProps={{ variant: "h2" }}
            secondary="Send the recovery public key and its checksum to Fireblocks Support. Once Fireblocks Support receives the key, you are contacted to perform an integrity check on the key and verify it has not been tampered with."
          />
        </ListItem>
        <ListItem sx={{ paddingLeft: "4.5rem" }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                color="primary"
                fullWidth
                disabled={activeStep < 3}
                onClick={onDownload}
                component="a"
                href={rsaKeypairUris?.publicKeyUri ?? ""}
                download="fb-recovery-pub.pem"
              >
                Download Public Key
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                color="primary"
                fullWidth
                disabled={activeStep < 3}
                onClick={onDownload}
                component="a"
                href={rsaKeypairUris?.checksumUri ?? ""}
                download="fb-recovery-pub.md5"
              >
                Download Checksum
              </Button>
            </Grid>
          </Grid>
        </ListItem>
        <ListItem sx={{ alignItems: "flex-start" }}>
          <ListItemAvatar>
            <Avatar
              sx={{
                background: (theme) =>
                  activeStep === 4 ? theme.palette.primary.main : undefined,
              }}
            >
              4
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Download the offline key recovery package."
            primaryTypographyProps={{ variant: "h2" }}
            secondary={
              <>
                <Typography variant="body1" paragraph>
                  After the integrity check on the public key is complete, an
                  encrypted key backup ZIP file containing both your key shares
                  and Fireblocks key shares is generated. Your key shares are
                  encrypted using the recovery passphrase entered during the
                  owner&apos;s mobile setup. The Fireblocks key shares are
                  encrypted using your public key.
                </Typography>
                <Typography variant="body1" paragraph>
                  You will receive a time-limited link to download the backup
                  file. Download the package and store it safely and
                  redundantly. Preferably it should be stored separately from
                  the machine that stores the recovery private key.
                </Typography>
              </>
            }
          />
        </ListItem>
        <ListItem sx={{ alignItems: "flex-start" }}>
          <ListItemAvatar>
            <Avatar>5</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Verify recovery."
            primaryTypographyProps={{ variant: "h2" }}
            secondary="Use Recovery Utility to verify your recovery kit. Check that the recovered Fireblocks master public keys match the keys in your Fireblocks Console Settings. The public keys and private keys of all of wallets in this workspace are derived from the extended public keys and private keys."
          />
        </ListItem>
        <ListItem sx={{ paddingLeft: "4.5rem" }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                color="primary"
                fullWidth
                component={NextLinkComposed}
                to="/recover?verifyOnly=true"
                disabled={activeStep < 4}
              >
                Verify Recovery
              </Button>
            </Grid>
          </Grid>
        </ListItem>
      </List>
    </Box>
  );
};

Backup.getLayout = (page) => (
  <Layout hideNavigation hideSidebar>
    {page}
  </Layout>
);

export default Backup;
