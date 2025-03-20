import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useDispatch, useSelector } from "react-redux";
import { updateToggleValue } from "../redux/slice/counterSlice";

const Navbar = () => {
  const toggle = useSelector((state) => state.counter.toggleValue);
  const dispatch = useDispatch();
  const [alignment, setAlignment] = React.useState(toggle);
  const handleChange = (event, newAlignment) => {
    setAlignment(newAlignment);
    // dispatch({ type: "counter/updateToggleValue", payload: newAlignment });
    dispatch(updateToggleValue(newAlignment));
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: "#333" }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ACC
          </Typography>
          <ToggleButtonGroup
            color="secondary"
            value={alignment}
            exclusive
            onChange={handleChange}
            aria-label="Platform"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="Docs">Docs</ToggleButton>
            <ToggleButton value="Build">Build</ToggleButton>
          </ToggleButtonGroup>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Navbar;
