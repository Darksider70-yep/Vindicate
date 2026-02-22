import { useState } from "react";
import { uploadCredential } from "../utils/api";

function UploadForm() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.toString();
      const result = await uploadCredential({ name, fileData: base64Data });
      console.log("Uploaded:", result);
      alert(`Stored on IPFS: ${result.ipfsHash}\nTx: ${result.txHash}`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Credential name"
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button type="submit">Upload</button>
    </form>
  );
}

export default UploadForm;
