'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Plus, Minus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  salePrice: number;
  quantity: number;
  category: { name: string };
}

interface CartItem extends Product {
  cartQuantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeypressRef = useRef<number>(0);

  // Mahsulotlarni yuklash
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Mahsulotlarni yuklashda xatolik:', error);
    }
  };

  // BARCODE SCANNER - Avtomatik ishlaydi
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeypressRef.current;

      // Agar tugmalar juda tez bosilsa (< 50ms), bu scanner
      if (timeDiff < 50 && e.key !== 'Enter') {
        e.preventDefault();
      }

      lastKeypressRef.current = currentTime;

      // Enter tugmasi - barcode tugadi
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          e.preventDefault();
          handleBarcodeScanned(barcodeBuffer);
          setBarcodeBuffer('');
        }
        return;
      }

      // Raqamlar va harflar - barcode qismi
      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        setBarcodeBuffer((prev) => prev + e.key);

        // Timeout - agar scanner emas, tozalash
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        barcodeTimeoutRef.current = setTimeout(() => {
          if (timeDiff > 100) {
            setBarcodeBuffer('');
          }
        }, 500);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [barcodeBuffer]);

  // Barcode orqali mahsulot qidirish va savatga qo'shish
  const handleBarcodeScanned = async (barcode: string) => {
    setScannerActive(true);
    setLastScannedBarcode(barcode);
    
    console.log('🔍 Barcode skanerlandi:', barcode); // DEBUG
    
    try {
      const res = await fetch(`/api/products/barcode/${barcode}`);
      console.log('📡 API javob statusi:', res.status); // DEBUG
      
      if (res.ok) {
        const product = await res.json();
        console.log('✅ Mahsulot topildi:', product.name, '- Kategoriya:', product.category?.name); // DEBUG
        addToCart(product);
        
        // Success feedback - audio beep
        playSuccessSound();
      } else {
        // Error feedback
        const errorData = await res.json();
        console.error('❌ Xato:', errorData.error, '- Barcode:', barcode); // DEBUG
        console.error('📊 To\'liq xato ma\'lumoti:', errorData); // DEBUG
        
        // Foydalanuvchiga xabar ko'rsatish
        alert(`Mahsulot topilmadi!\nShtrix kod: ${barcode}\nSabab: ${errorData.error}`);
        
        playErrorSound();
      }
    } catch (error) {
      playErrorSound();
      console.error('🔥 Barcode qidirishda xatolik:', error);
      alert('Server xatosi! Console ni tekshiring.');
    } finally {
      setTimeout(() => {
        setScannerActive(false);
        setLastScannedBarcode('');
      }, 1000);
    }
  };

  // Success ovozi
  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Error ovozi
  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    gainNode.gain.value = 0.3;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // Savatga qo'shish
  const addToCart = (product: Product) => {
    console.log('🛒 Savatga qo\'shish:', product.name, '- Kategoriya:', product.category?.name); // DEBUG
    
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      
      if (existingItem) {
        // Agar mavjud bo'lsa, miqdorni oshirish
        if (existingItem.cartQuantity < existingItem.quantity) {
          console.log('✅ Miqdor oshirildi:', existingItem.cartQuantity + 1); // DEBUG
          return prevCart.map((item) =>
            item.id === product.id
              ? { ...item, cartQuantity: item.cartQuantity + 1 }
              : item
          );
        }
        console.warn('⚠️ Zaxira yetarli emas!'); // DEBUG
        alert(`Zaxira yetarli emas! Mavjud: ${existingItem.quantity}`);
        return prevCart; // Zaxira yetarli emas
      } else {
        // Yangi mahsulot
        if (product.quantity > 0) {
          console.log('✅ Yangi mahsulot savatga qo\'shildi'); // DEBUG
          return [...prevCart, { ...product, cartQuantity: 1 }];
        }
        console.warn('⚠️ Zaxira yo\'q!'); // DEBUG
        alert('Bu mahsulot zaxirada yo\'q!');
        return prevCart; // Zaxira yo'q
      }
    });
  };

  // Savatdan olib tashlash
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Miqdorni o'zgartirish
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.cartQuantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.quantity) return item;
          return { ...item, cartQuantity: newQuantity };
        }
        return item;
      })
    );
  };

  // Jami summa
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.salePrice * item.cartQuantity,
    0
  );

  // Kategoriyalar
  const categories = ['all', ...new Set(products.map((p) => p.category.name))];

  // Filtrlangan mahsulotlar
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || product.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Savatni tozalash
  const clearCart = () => {
    setCart([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kassa (POS)</h1>
            <p className="text-sm text-gray-500 mt-1">
              Shtrix kod skanerdan foydalaning yoki mahsulotni tanlang
            </p>
          </div>
          
          {/* Scanner status indicator */}
          {scannerActive && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Skaner aktiv: {lastScannedBarcode}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Mahsulotlar paneli */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Qidiruv va kategoriyalar */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki shtrix kod..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Kategoriyalar */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'Barchasi' : category}
                </button>
              ))}
            </div>
          </div>

          {/* Mahsulotlar grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.quantity === 0}
                  className={`bg-white border rounded-lg p-4 text-left transition-all hover:shadow-md ${
                    product.quantity === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-gray-900 cursor-pointer'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {product.category.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {product.salePrice.toLocaleString()} so'm
                    </span>
                    <span
                      className={`text-xs ${
                        product.quantity > 10
                          ? 'text-green-600'
                          : product.quantity > 0
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {product.quantity} ta
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Savat paneli */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Savat header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-900" />
                <span className="font-semibold text-gray-900">Savat</span>
                <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Tozalash
                </button>
              )}
            </div>
          </div>

          {/* Savat elementlari */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Savat bo&apos;sh</p>
                <p className="text-sm mt-1">Shtrix kod skaner yordamida qo&apos;shing</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.salePrice.toLocaleString()} so'm
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        disabled={item.cartQuantity <= 1}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.cartQuantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        disabled={item.cartQuantity >= item.quantity}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {(item.salePrice * item.cartQuantity).toLocaleString()} so'm
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* To'lov qismi */}
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Jami:</span>
              <span className="text-2xl font-bold text-gray-900">
                {totalAmount.toLocaleString()} so'm
              </span>
            </div>

            <button
              onClick={() => setPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              To&apos;lovni amalga oshirish
            </button>
          </div>
        </div>
      </div>

      {/* To'lov modali */}
      {paymentModalOpen && (
        <PaymentModal
          totalAmount={totalAmount}
          cart={cart}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            clearCart();
            setPaymentModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// To'lov modali komponenti
function PaymentModal({
  totalAmount,
  cart,
  onClose,
  onSuccess,
}: {
  totalAmount: number;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentType, setPaymentType] = useState<'CASH' | 'CARD' | 'MIXED'>('CASH');
  const [cashAmount, setCashAmount] = useState<string>(totalAmount.toString());
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [processing, setProcessing] = useState(false);

  const cashValue = parseFloat(cashAmount) || 0;
  const cardValue = parseFloat(cardAmount) || 0;
  const change = cashValue - totalAmount;

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount,
          paymentType,
          cashAmount: paymentType === 'CARD' ? 0 : cashValue,
          cardAmount: paymentType === 'CASH' ? 0 : cardValue,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.cartQuantity,
            priceAtSale: item.salePrice,
          })),
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        alert('Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('To\'lov xatosi:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">To&apos;lov</h2>

        <div className="space-y-4">
          {/* Jami summa */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">To&apos;lov summasi</div>
            <div className="text-2xl font-bold text-gray-900">
              {totalAmount.toLocaleString()} so'm
            </div>
          </div>

          {/* To'lov turi */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              To&apos;lov turi
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentType('CASH')}
                className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                  paymentType === 'CASH'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Naqd</div>
              </button>
              <button
                onClick={() => setPaymentType('CARD')}
                className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                  paymentType === 'CARD'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Karta</div>
              </button>
              <button
                onClick={() => setPaymentType('MIXED')}
                className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                  paymentType === 'MIXED'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs">Aralash</div>
              </button>
            </div>
          </div>

          {/* Naqd summa */}
          {(paymentType === 'CASH' || paymentType === 'MIXED') && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Naqd summa
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              />
              {paymentType === 'CASH' && change >= 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  Qaytim: <span className="font-semibold">{change.toLocaleString()} so'm</span>
                </div>
              )}
            </div>
          )}

          {/* Karta summa */}
          {paymentType === 'MIXED' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Karta summa
              </label>
              <input
                type="number"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}

          {/* Tugmalar */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              onClick={handlePayment}
              disabled={
                processing ||
                (paymentType === 'CASH' && cashValue < totalAmount) ||
                (paymentType === 'MIXED' && cashValue + cardValue !== totalAmount)
              }
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {processing ? 'Jarayonda...' : 'Tasdiqlash'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
