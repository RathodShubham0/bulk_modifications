import { Button } from "@mui/material";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as XLSX from "xlsx";
import axios from "axios";

function MainComponent() {
  const state = useSelector((state) => state);
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);

  

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const getAccessToken = async () => {
    try {
      const response = await axios.post(
        "https://developer.api.autodesk.com/authentication/v2/token",
        new URLSearchParams({
          grant_type: "client_credentials",
          scope: "data:read data:write",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic YzdJSkRPa1d5b1VNenZtQWlISmkxQjlIdXlxM1oxMVA6M1Q4dlBRSmxNbEFLa2ZNMA==",
          },
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error("Error fetching access token:", error.response?.data || error.message);
      return null;
    }
  };

  const getAttributeDefinitions = async (projectId, folderId, accessToken) => {
    const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/folders/${folderId}/custom-attribute-definitions`;

    try {
        const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("Attribute Definitions:", response.data.results);
      return response.data.results || [];
    } catch (error) {
      console.error("Error fetching attribute definitions:", error.response?.data || error.message);
      return [];
    }
  };

  const updateCustomAttributes = async (attributeData) => {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    for (const data of attributeData) {
      // Normalize column keys by trimming spaces
      const projectId = data["Project id"]?.trim() || data["Project id "]?.trim();
      const versionId = data.urn?.trim();
      const folderId = data["Folder id"]?.trim() || data["Folder id "]?.trim();

      if (!projectId || !versionId || !folderId) {
        console.error("Missing required data:", { projectId, versionId, folderId });
        continue;
      }

      const attributeDefinitions = await getAttributeDefinitions(projectId, folderId, accessToken);
      if (!attributeDefinitions.length) {
        console.error("No attribute definitions found for project:", projectId);
        continue;
      }

      const attributeMap = attributeDefinitions.reduce((map, attr) => {
        map[attr.name.toLowerCase()] = attr.id;
        return map;
      }, {});

      const body = Object.keys(data).map(key => {
        const attributeName = key.trim().toLowerCase();
        const attributeId = attributeMap[attributeName];
        const attributeValue = data[key];
      
        return attributeId && attributeValue !== undefined ? { id: attributeId, value: attributeValue } : null;
      }).filter(attr => attr !== null);


      if (!body.length) {
        console.error("No valid attributes to update for version:", versionId);
        continue;
      }
      const encodedVersionId = versionId; 

      // Convert URL-safe Base64 to standard Base64
      const base64String = encodedVersionId.replace(/_/g, '/').replace(/-/g, '+');
      
      // Ensure padding is correct
      const paddedBase64String = base64String.padEnd(base64String.length + (4 - (base64String.length % 4)) % 4, '=');
      
      // Decode Base64
      const decodedVersionId = window.atob(paddedBase64String)
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .replace(/:/g, '%3A')
      .replace(/\?/g, '%3F')
      .replace(/=/g, '%3D')
      .replace(/&/g, '%26');
      
      console.log(decodedVersionId);

 
      const url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/versions/${decodedVersionId}/custom-attributes:batch-update`;
      try {
        const response = await axios.post(url, body , {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Custom attributes updated successfully:", response.data);
      } catch (error) {
        console.error("Error updating custom attributes:", error.response?.data || error.message);
      }
    }
  };

  const handleAttributeClick = () => {
    if (!file) {
      alert("Please upload an Excel file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      let json = XLSX.utils.sheet_to_json(worksheet);

      // Normalize object keys to remove extra spaces
      json = json.map(row => {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.trim()] = row[key]; // Trim spaces from keys
        });
        return normalizedRow;
      });

      console.log("Parsed Excel Data:", json);
      dispatch({ type: "BULK_UPLOAD_ATTRIBUTES", payload: json });
      await updateCustomAttributes(json);
    };

    reader.readAsArrayBuffer(file);
  };
  const handlePermissionClick = async () => {
    if (!file) {
      alert("Please upload an Excel file first.");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      let json = XLSX.utils.sheet_to_json(worksheet);
  
      // Normalize object keys to remove extra spaces
      json = json.map(row => {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.trim()] = row[key]; // Trim spaces from keys
        });
        return normalizedRow;
      });
  
      console.log("Parsed Excel Data:", json);
  
      const accessToken = await getAccessToken();
      if (!accessToken) return;
  
      for (const data of json) {
        const projectId = data["Project id"]?.trim();
        const folderId = data["Folder id"]?.trim();
        const permissionAction = data["Permission"]?.trim().toLowerCase();
        const action = data["Action"]?.trim().toUpperCase();
  
        if (!projectId || !folderId || !permissionAction || !action) {
          console.error("Missing required data:", { projectId, folderId, permissionAction, action });
          continue;
        }
  
        // Step 1: Make a GET request to fetch the current permissions
        const getUrl = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/folders/${folderId}/permissions`;
        let currentPermissions;
        try {
          const response = await axios.get(getUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          currentPermissions = response.data;
          console.log("Current permissions:", currentPermissions);
        } catch (error) {
          console.error("Error fetching current permissions:", error.response?.data || error.message);
          continue;
        }

        const userPermissions = currentPermissions.filter(permission => permission.subjectType === 'USER');

        // Step 2: Use the retrieved data to create a new permission for all users
        const body = userPermissions.map(permission => ({
          autodeskId: permission.autodeskId,
          subjectType: permission.subjectType,
          subjectId: permission.subjectId,
          actions: [action],
        }));
  
        let url = `https://developer.api.autodesk.com/bim360/docs/v1/projects/${projectId}/folders/${folderId}/permissions`;
  
        switch (permissionAction) {
          case 'create':
            url += ':batch-create';
            break;
          default:
            console.error("Invalid permission action:", permissionAction);
            continue;
        }
  
        try {
          const response = await axios.post(url, body, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          console.log(`Permissions ${permissionAction}d successfully:`, response.data);
        } catch (error) {
          console.error(`Error ${permissionAction}ing permissions:`, error.response?.data || error.message);
        }
      }
    };
  
    reader.readAsArrayBuffer(file);
  };
  
  const handleRenameClick = async () => {
    if (!file) {
      alert("Please upload an Excel file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      let json = XLSX.utils.sheet_to_json(worksheet);

      // Normalize object keys to remove extra spaces
      json = json.map(row => {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.trim()] = row[key]; // Trim spaces from keys
        });
        return normalizedRow;
      });

      console.log("Parsed Excel Data:", json);

      const accessToken = await getAccessToken();
      if (!accessToken) return;

      for (const data of json) {
        const projectId = data["Project id"]?.trim();
        const folderId = data["Folder id"]?.trim();
        const urn = data["urn"]?.trim();
        const newName = data["name"]?.trim();

        if (!projectId || !folderId || !urn || !newName) {
          console.error("Missing required data:", { projectId, folderId, urn, newName });
          continue;
        }

        const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${urn}`;

        const body = {
          jsonapi: { version: "1.0" },
          data: {
            type: "items",
            id: urn,
            attributes: {
              displayName: newName,
            },
          },
        };

        try {
          const response = await axios.patch(url, body, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/vnd.api+json",
            },
          });
          console.log(`File renamed successfully:`, response.data);
        } catch (error) {
          console.error(`Error renaming file:`, error.response?.data || error.message);
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };
  return (
    <div>
      <p>Counter: {state.counter.toggleValue}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <Button variant="outlined" onClick={handleAttributeClick}>Attribute</Button>
        <Button variant="outlined">Description</Button>
        <Button variant="outlined" onClick={handlePermissionClick}>Permission</Button>
        <Button variant="outlined" onClick={handleRenameClick}>Renaming</Button>

      </div>
    </div>
  );
}

export default MainComponent;
