'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, Gift } from 'lucide-react';

interface PostPurchaseProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  description: string;
  discount?: number;
}

export default function PostPurchasePage() {
  const [showPopup, setShowPopup] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<PostPurchaseProduct | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Sample post-purchase products
  const postPurchaseProducts: PostPurchaseProduct[] = [
    {
      id: 'upsell-1',
      title: 'Допълнителна гаранция',
      price: 2999, // in cents
      image: '/api/placeholder/200/200',
      description: 'Разширена гаранция за вашия продукт',
      discount: 20
    },
    {
      id: 'upsell-2', 
      title: 'Аксесоари комплект',
      price: 1999,
      image: '/api/placeholder/200/200',
      description: 'Полезни аксесоари за вашия продукт',
      discount: 15
    },
    {
      id: 'upsell-3',
      title: 'Специална поддръжка',
      price: 999,
      image: '/api/placeholder/200/200', 
      description: 'Приоритетна поддръжка и консултации',
      discount: 10
    }
  ];

  useEffect(() => {
    // Get order data from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const orderNumber = urlParams.get('order_number');
    
    if (orderId || orderNumber) {
      setOrderData({ orderId, orderNumber });
    }

    // Show popup after a short delay
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAddToCart = async (product: PostPurchaseProduct) => {
    setIsAddingToCart(true);
    
    try {
      // Add product to cart via Shopify API
      const response = await fetch('/api/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          discount: product.discount
        })
      });

      if (response.ok) {
        // Redirect to cart or show success message
        window.location.href = '/cart';
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Възникна грешка при добавянето на продукта. Моля, опитайте отново.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('bg-BG', {
      style: 'currency',
      currency: 'BGN'
    });
  };

  if (!showPopup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main thank you content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Благодарим за поръчката!</h1>
            <p className="text-lg text-gray-600">
              Вашата поръчка е получена и ще бъде обработена скоро.
            </p>
            {orderData?.orderNumber && (
              <p className="text-sm text-gray-500 mt-2">
                Номер на поръчка: #{orderData.orderNumber}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Продължете пазаруването
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowPopup(true)}
              className="ml-4"
            >
              Вижте нашите препоръки
            </Button>
          </div>
        </div>
      </div>

      {/* Post-purchase popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Специална оферта за вас!</h2>
              </div>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-6 text-center">
                Благодарим за покупката! Ето няколко продукта, които може да ви заинтересуват:
              </p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {postPurchaseProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400" />
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{product.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {product.discount && (
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        <div className="text-lg font-bold text-green-600">
                          {formatPrice(product.price * (1 - (product.discount || 0) / 100))}
                        </div>
                      </div>
                      {product.discount && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          -{product.discount}%
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={isAddingToCart}
                      className="w-full"
                      size="sm"
                    >
                      {isAddingToCart ? 'Добавяне...' : 'Добави в кошницата'}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowPopup(false)}
                  className="mr-4"
                >
                  Не, благодаря
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Продължете пазаруването
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
