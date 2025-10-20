// app/components/PaymentDialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CreditCard, Building2, Wallet, Loader2 } from 'lucide-react'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  onSubmit: (paymentMethod: string) => Promise<void>
  title?: string
  description?: string
}

export default function PaymentDialog({
  open,
  onOpenChange,
  amount,
  onSubmit,
  title = 'Complete Payment',
  description = 'Select your payment method to complete the booking'
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('CreditCard')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async () => {
    if (!selectedMethod) return
    
    setProcessing(true)
    try {
      await onSubmit(selectedMethod)
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const paymentMethods = [
    {
      value: 'CreditCard',
      label: 'Credit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, Amex'
    },
    {
      value: 'DebitCard',
      label: 'Debit Card',
      icon: CreditCard,
      description: 'Bank debit card'
    },
    {
      value: 'BankTransfer',
      label: 'Bank Transfer',
      icon: Building2,
      description: 'Direct bank transfer'
    },
    {
      value: 'Cash',
      label: 'Cash',
      icon: Wallet,
      description: 'Pay in cash at reception'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Display */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Amount to Pay</span>
              <span className="text-2xl font-bold text-amber-700">${amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      selectedMethod === method.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <Icon className={`h-5 w-5 ${
                      selectedMethod === method.value ? 'text-amber-600' : 'text-gray-500'
                    }`} />
                    <div className="flex-1">
                      <Label
                        htmlFor={method.value}
                        className="font-medium cursor-pointer"
                      >
                        {method.label}
                      </Label>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={processing || !selectedMethod}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
