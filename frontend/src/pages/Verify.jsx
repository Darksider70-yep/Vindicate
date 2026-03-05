import { useState } from "react";
import { useParams } from "react-router-dom";
import Container from "../components/layout/Container";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import VerificationResult from "../components/ui/VerificationResult";

const Verify = () => {
  const { hash } = useParams();
  const [inputValue, setInputValue] = useState(hash || "");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerify = () => {
    setIsLoading(true);
    setVerificationResult(null);

    // Simulate API call
    setTimeout(() => {
      const isValid = Math.random() > 0.3; // 70% chance of success
      setVerificationResult({
        isValid,
        credential: {
          issuer: "did:ethr:0x1234...5678",
          type: ["VerifiableCredential", "UniversityDegreeCredential"],
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: "did:pkh:eip155:1:0xabcd...efgh",
            degree: {
              type: "BachelorDegree",
              name: "Bachelor of Science in Computer Science",
            },
          },
        },
      });
      setIsLoading(false);
    }, 2000);
  };

  return (
    <Container className="py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-center">Verify Credential</h1>
        <p className="mt-2 text-center text-muted">
          Enter a credential hash or URL to verify its authenticity.
        </p>
        <div className="mt-8 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter credential hash..."
            className="flex-grow"
          />
          <Button onClick={handleVerify} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </div>

        <div className="mt-8">
          {isLoading && (
            <div className="text-center">
              <p>Verifying credential...</p>
            </div>
          )}
          {verificationResult && (
            <VerificationResult
              isValid={verificationResult.isValid}
              credential={verificationResult.credential}
            />
          )}
        </div>
      </div>
    </Container>
  );
};

export default Verify;

