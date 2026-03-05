import { motion } from "framer-motion";
import { CheckCircle, XCircle, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

const VerificationResult = ({ isValid, credential }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const Badge = isValid ? CheckCircle : XCircle;
  const badgeColor = isValid ? "text-success" : "text-danger";

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Card>
        <CardHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="flex flex-col items-center"
          >
            <Badge size={80} className={badgeColor} />
            <CardTitle className="mt-4">
              {isValid ? "Credential Verified" : "Verification Failed"}
            </CardTitle>
          </motion.div>
        </CardHeader>
        <CardContent>
          {credential && (
            <motion.div variants={itemVariants} className="mt-4">
              <h4 className="font-semibold">Credential Details:</h4>
              <pre className="mt-2 text-sm bg-panel p-4 rounded-lg overflow-auto">
                {JSON.stringify(credential, null, 2)}
              </pre>
              {isValid && (
                <a
                  href="https://etherscan.io/tx/0x1234...5678" // Replace with actual transaction hash
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-sm text-primary hover:text-primary-strong"
                >
                  View on Etherscan <ArrowUpRight className="ml-1 h-4 w-4" />
                </a>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VerificationResult;

