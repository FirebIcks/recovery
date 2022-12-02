import { Box, BoxProps, Typography } from "@mui/material";

type Props = BoxProps;

export const Footer = (props: Props) => (
  <Box component="footer" gridArea="footer" padding="1em" {...props}>
    <Typography variant="body2" color="text.secondary">
      Fireblocks
      {" © "}
      {new Date().getFullYear()}. All Rights Reserved. NMLS Registration Number:
      2066055
    </Typography>
  </Box>
);
