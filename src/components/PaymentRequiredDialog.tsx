import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, Sparkles } from 'lucide-react';

interface PaymentRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

const PaymentRequiredDialog: React.FC<PaymentRequiredDialogProps> = ({
  open,
  onOpenChange,
  featureName
}) => {
  const navigate = useNavigate();

  const handlePayment = () => {
    onOpenChange(false);
    navigate('/payment');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Unlock {featureName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              This feature is available for paid members only. Complete your one-time payment to unlock all platform features.
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Just ₹49</span>
              </div>
              <p className="text-xs text-muted-foreground">
                One-time payment • Lifetime access • No subscriptions
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Continue Exploring
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handlePayment}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Pay ₹49 & Unlock
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentRequiredDialog;
