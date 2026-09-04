"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ShoppingCart, Search, Store, Edit2, Upload, Box, Check, X, Plus, Minus, Package, Clock, Target, CheckCircle, Image as ImageIcon } from 'lucide-react';

const PROFILE_KEY = 'meus3d_store_profile';
const CART_KEY = 'meus3d_cart_session';

interface ProductValue {
  salePrice?: number;
  salePriceMarketplace?: number;
  weight?: number;
  printTime?: number;
  filamentName?: string;
  machineId?: string;
  quantity?: number;
}
interface ProductResult {
  totalShippingCost?: number;
  platformFeeValue?: number;
  totalPlatformFee?: number;
  unitCostProduction?: number;
  unitCostTotalFull?: number;
  unitCost?: number;
  filamentCost?: number;
  energyCost?: number;
  machineCost?: number;
  totalPostProcessing?: number;
  totalDesignCost?: number;
  totalOtherCosts?: number;
  totalFailureCost?: number;
  totalPackagingCost?: number;
  quantity?: number;
}
interface Product {
  id: string;
  name: string;
  color?: string;
  _type: 'single' | 'kit';
  values: ProductValue;
  results?: ProductResult;
  image?: string;
}
interface Profile {
  storeName: string;
  sellerName: string;
}
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  _type: string;
  channel: string;
}

export default function LojaPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<Profile>({ storeName: 'Minha Loja 3D', sellerName: 'Vendedor' });
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [editStoreName, setEditStoreName] = useState('');
  const [editSellerName, setEditSellerName] = useState('');

  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [selectedMkt, setSelectedMkt] = useState('');
  const [confirmShipping, setConfirmShipping] = useState('');
  const [confirmTaxes, setConfirmTaxes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const [addedEffect, setAddedEffect] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [prodRes, mktRes, setRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('marketplaces').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      const loadedProducts: Product[] = [];
      const stockMap: Record<string, number> = {};
      const imgMap: Record<string, string> = {};

      if (prodRes.data) {
        prodRes.data.forEach((p: any) => {
          loadedProducts.push({
            id: p.id,
            name: p.name || 'Sem nome',
            _type: p.type || p._type || 'single',
            values: p.values || {},
            results: p.results || {},
            image: p.image || ''
          });
          stockMap[p.id] = p.stock || 0;
          if (p.image) imgMap[p.id] = p.image;
        });
      }

      setProducts(loadedProducts);
      setStock(stockMap);
      setImages(imgMap);

      if (mktRes.data && mktRes.data.length > 0) {
        setMarketplaces(mktRes.data);
      } else {
        setMarketplaces([{ id: 'direct', name: 'Venda Direta', fee_percentage: 0, free_shipping_cost: 0 }]);
      }

      if (setRes.data && setRes.data.store_name) {
        setProfile({
          storeName: setRes.data.store_name || 'Minha Loja 3D',
          sellerName: setRes.data.seller_name || 'Vendedor'
        });
      } else {
        try {
          const localProf = JSON.parse(localStorage.getItem(PROFILE_KEY) || '');
          if (localProf) setProfile(localProf);
        } catch (e) {}
      }

      try {
        const c = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
        setCart(Array.isArray(c) ? c : []);
      } catch (e) {}
    } catch (err) {
      console.error("Erro ao carregar loja:", err);
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    sessionStorage.setItem(CART_KEY, JSON.stringify(newCart));
  };

  const showToast = (msg: string) => {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      const t = document.createElement('div');
      t.className = 'toast show success';
      t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${msg}</span>`;
      toastContainer.appendChild(t);
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    }
  };

  const showErrorToast = (msg: string) => {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      const t = document.createElement('div');
      t.className = 'toast show error';
      t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>${msg}</span>`;
      toastContainer.appendChild(t);
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    }
  };

  const handleSaveProfile = async () => {
    const newProfile = { storeName: editStoreName || 'Minha Loja 3D', sellerName: editSellerName || 'Vendedor' };
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    
    if (user) {
      try {
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          store_name: newProfile.storeName,
          seller_name: newProfile.sellerName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error(err);
      }
    }

    setIsStoreModalOpen(false);
    showToast('Perfil atualizado!');
  };

  const triggerUpload = (id: string) => {
    setUploadTargetId(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          ctx.drawImage(img, sx, sy, s, s, 0, 0, 300, 300);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const newImages = { ...images, [uploadTargetId]: dataUrl };
          setImages(newImages);

          if (user) {
            await supabase.from('products').update({ image: dataUrl }).eq('id', uploadTargetId);
          }

          showToast('Imagem atualizada!');
        }
      };
      if (ev.target?.result) {
        img.src = ev.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const addToCart = (product: Product, channel: string) => {
    const qtyInStock = stock[product.id] || 0;
    const currentInCartTotal = cart.filter(c => String(c.id) === String(product.id)).reduce((s, i) => s + i.qty, 0);

    if (currentInCartTotal >= qtyInStock) {
      showErrorToast('Quantidade máxima em estoque atingida!');
      return;
    }

    const existingIndex = cart.findIndex(c => String(c.id) === String(product.id) && c.channel === channel);
    const newCart = [...cart];

    if (existingIndex >= 0) {
      newCart[existingIndex].qty += 1;
    } else {
      let itemPrice = product.values?.salePrice || 0;
      if (channel === 'marketplace' && product.values?.salePriceMarketplace) {
        itemPrice = product.values.salePriceMarketplace;
      }
      newCart.push({
        id: product.id,
        name: product.name,
        price: itemPrice,
        qty: 1,
        _type: product._type,
        channel
      });
    }

    saveCart(newCart);
    showToast(`${product.name} adicionado ao carrinho!`);
    
    const effectId = `${product.id}_${channel}`;
    setAddedEffect(effectId);
    setTimeout(() => setAddedEffect(null), 1200);
  };

  const removeCartItem = (id: string, channel: string) => {
    const newCart = cart.filter(c => !(String(c.id) === String(id) && c.channel === channel));
    saveCart(newCart);
  };

  const changeCartQty = (id: string, channel: string, delta: number) => {
    const existingIndex = cart.findIndex(c => String(c.id) === String(id) && c.channel === channel);
    if (existingIndex < 0) return;
    
    const maxQty = stock[id] || 0;
    const otherChannelsQty = cart.filter(c => String(c.id) === String(id) && c.channel !== channel).reduce((s, i) => s + i.qty, 0);
    const newQty = cart[existingIndex].qty + delta;

    if (newQty <= 0) {
      removeCartItem(id, channel);
      return;
    }
    if ((newQty + otherChannelsQty) > maxQty) {
      showErrorToast('Estoque insuficiente!');
      return;
    }

    const newCart = [...cart];
    newCart[existingIndex].qty = newQty;
    saveCart(newCart);
  };

  const handleOpenConfirm = () => {
    if (cart.length === 0) return;

    let estimatedShipping = 0;
    let estimatedTaxes = 0;
    
    cart.forEach(item => {
      const p = products.find(x => String(x.id) === String(item.id));
      if (p && p.results) {
        const q = p.values?.quantity || 1;
        const r = p.results;
        estimatedShipping += ((r.totalShippingCost || 0) / q) * item.qty;
        if (item.channel === 'marketplace') {
          estimatedTaxes += (r.platformFeeValue !== undefined ? r.platformFeeValue : (r.totalPlatformFee || 0) / q) * item.qty;
        }
      }
    });

    setConfirmShipping(estimatedShipping.toFixed(2));
    setConfirmTaxes(estimatedTaxes.toFixed(2));
    setSelectedMkt('');
    setIsConfirmModalOpen(true);
  };

  const handleMktChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMkt(val);
    if (val) {
      const mkt = marketplaces.find(m => String(m.id) === val);
      if (mkt) {
        const totalValue = cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const comRate = parseFloat(mkt.fee_percentage !== undefined ? mkt.fee_percentage : mkt.commissionRate) || 0;
        const defShip = parseFloat(mkt.free_shipping_cost !== undefined ? mkt.free_shipping_cost : mkt.defaultShipping) || 0;
        setConfirmShipping(defShip.toFixed(2));
        setConfirmTaxes((totalValue * (comRate / 100)).toFixed(2));
      }
    } else {
      let estimatedShipping = 0;
      let estimatedTaxes = 0;
      cart.forEach(item => {
        const p = products.find(x => String(x.id) === String(item.id));
        if (p && p.results) {
          const q = p.values?.quantity || 1;
          const r = p.results;
          estimatedShipping += ((r.totalShippingCost || 0) / q) * item.qty;
          if (item.channel === 'marketplace') {
            estimatedTaxes += (r.platformFeeValue !== undefined ? r.platformFeeValue : (r.totalPlatformFee || 0) / q) * item.qty;
          }
        }
      });
      setConfirmShipping(estimatedShipping.toFixed(2));
      setConfirmTaxes(estimatedTaxes.toFixed(2));
    }
  };

  const handleConfirmSale = async () => {
    if (!user) return;
    let stockError = false;
    for (const item of cart) {
      const available = stock[item.id] || 0;
      if (item.qty > available) {
        showErrorToast(`Estoque insuficiente para "${item.name}"!`);
        stockError = true;
        break;
      }
    }
    if (stockError) {
      setIsConfirmModalOpen(false);
      return;
    }

    const newStock = { ...stock };
    for (const item of cart) {
      const newQty = Math.max(0, (newStock[item.id] || 0) - item.qty);
      newStock[item.id] = newQty;
      await supabase.from('products').update({ stock: newQty }).eq('id', item.id);
    }
    setStock(newStock);

    const sShipping = parseFloat(confirmShipping) || 0;
    const sTaxes = parseFloat(confirmTaxes) || 0;
    const totalValue = cart.reduce((s, i) => s + (i.price * i.qty), 0);

    const saleItems = cart.map(i => {
      const prod = products.find(p => String(p.id) === String(i.id));
      let costs = null;
      let mId = null;
      if (prod && prod.results) {
        mId = prod.values?.machineId || null;
        const r = prod.results;
        const q = r.quantity || 1;
        costs = {
          unitCostProduction: r.unitCostProduction || 0,
          unitCostTotalFull: r.unitCostTotalFull || r.unitCost || 0,
          platformFeeValue: r.platformFeeValue || r.totalPlatformFee || 0,
          totalShippingCost: r.totalShippingCost || 0,
          filamentCost: (r.filamentCost || 0) / q,
          energyCost: (r.energyCost || 0) / q,
          machineCost: (r.machineCost || 0) / q,
          totalPostProcessing: (r.totalPostProcessing || 0) / q,
          totalDesignCost: (r.totalDesignCost || 0) / q,
          totalOtherCosts: (r.totalOtherCosts || 0) / q,
          totalFailureCost: (r.totalFailureCost || 0) / q,
          totalPackagingCost: (r.totalPackagingCost || 0) / q,
          quantity: 1
        };
      }
      return {
        id: i.id,
        productId: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        type: i._type || 'single',
        channel: i.channel,
        costs,
        machineId: mId
      };
    });

    const { error: saleError } = await supabase.from('sales').insert([{
      user_id: user.id,
      timestamp: new Date().toISOString(),
      shipping: sShipping,
      taxes: sTaxes,
      items: saleItems,
      total: totalValue
    }]);

    if (saleError) {
      console.error("Erro ao registrar venda:", saleError);
      showErrorToast("Erro ao registrar venda no banco.");
      return;
    }

    saveCart([]);
    setIsConfirmModalOpen(false);
    setIsCartOpen(false);
    showToast(`Venda finalizada! Total: R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`);
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return q ? products.filter(p => p.name.toLowerCase().includes(q)) : products;
  }, [products, searchQuery]);

  const cartTotalItems = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotalValue = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  return (
    <AppLayout title="Loja / Vitrine" subtitle="Catálogo de produtos e ponto de venda">
      <style dangerouslySetInnerHTML={{__html: `
        .cart-badge-float {
          position: fixed; bottom: 24px; right: 24px; z-index: 50;
          background: var(--gradient-primary); color: white; border-radius: 50%;
          width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); cursor: pointer; transition: transform 0.2s;
        }
        .cart-badge-float:hover { transform: scale(1.08); }
        .cart-badge-count {
          position: absolute; top: -4px; right: -4px; background: #f97316; color: white;
          font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: bold;
          min-width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--bg-main);
        }
        .product-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;
        }
        .product-card {
          background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-lg);
          overflow: hidden; transition: all 0.3s ease; display: flex; flex-direction: column;
        }
        .product-card:hover { border-color: var(--accent-indigo); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .card-image-area {
          position: relative; width: 100%; aspect-ratio: 4/3; background: linear-gradient(135deg, rgba(30,30,50,0.5) 0%, rgba(15,15,25,0.8) 100%);
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .card-image-area img { width: 100%; height: 100%; object-fit: cover; }
        .card-upload-btn {
          position: absolute; bottom: 10px; right: 10px; background: rgba(13,17,23,0.85); backdrop-filter: blur(8px);
          border: 1px solid var(--border-card); border-radius: 8px; padding: 7px 9px; cursor: pointer;
          color: var(--text-secondary); display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;
          transition: all 0.2s;
        }
        .card-upload-btn:hover { border-color: var(--accent-indigo); color: var(--accent-indigo); }
        .card-tag {
          display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 4px;
        }
        .tag-single { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
        .tag-kit { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
        .card-price { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 900; color: var(--accent-emerald); margin: 10px 0 8px; }
        .card-stock { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; width: fit-content; margin-bottom: 14px; }
        .stock-available { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
        .stock-out { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .add-cart-btn {
          padding: 10px; border-radius: 10px; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .add-cart-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.02); }
        .add-cart-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
        
        .cart-sidebar {
          position: fixed; top: 0; right: -420px; width: 400px; max-width: 100vw; height: 100%;
          background: var(--bg-card); backdrop-filter: blur(20px); border-left: 1px solid var(--border-card);
          z-index: 1501; display: flex; flex-direction: column; transition: right 0.3s ease;
        }
        .cart-sidebar.open { right: 0; }
        .cart-item {
          background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 10px;
          padding: 14px; margin-bottom: 10px; transition: border-color 0.2s;
        }
        .cart-item:hover { border-color: var(--accent-indigo); }
        .qty-btn {
          width: 28px; height: 28px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px;
          color: var(--text-primary); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .qty-btn:hover { background: var(--border-card); }
        .qty-value {
          width: 40px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700;
          color: var(--text-primary); background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px;
          padding: 4px; outline: none; transition: border-color 0.2s;
        }
        .qty-value:focus { border-color: var(--accent-indigo); }
        .qty-value::-webkit-outer-spin-button, .qty-value::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}} />

      <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handleFileChange} />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px', position: 'relative', zIndex: 2 }}>
        
        {/* Top area: Profile & Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>
          
          <div className="card" style={{ 
            flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px'
          }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
            }}>🏪</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.storeName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {profile.sellerName}
              </div>
            </div>
            <button 
              onClick={() => {
                setEditStoreName(profile.storeName);
                setEditSellerName(profile.sellerName);
                setIsStoreModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              title="Editar Perfil"
            >
              <Edit2 size={16} />
            </button>
          </div>

          <div style={{ flex: '2 1 400px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180, height: '100%' }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '100%', padding: '12px 14px 12px 42px', background: 'var(--bg-input)', 
                  border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', 
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
              <Box size={56} style={{ opacity: 0.4, margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {searchQuery ? `Nenhum produto encontrado para "${searchQuery}"` : 'Nenhum produto cadastrado'}
              </h3>
              <p style={{ fontSize: '13px' }}>
                {searchQuery ? 'Tente buscar com outros termos.' : 'Cadastre produtos na Calculadora ou na página de Produtos para exibir aqui.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map(p => {
              const priceDirect = p.values?.salePrice || 0;
              const priceMarketplace = p.values?.salePriceMarketplace || 0;
              const displayPrice = priceDirect > 0 ? priceDirect : (priceMarketplace > 0 ? priceMarketplace : 0);
              const qty = stock[p.id] || 0;
              const hasImage = images[p.id];
              const isKit = p._type === 'kit';
              
              return (
                <div key={p.id} className="product-card">
                  <div className="card-image-area">
                    {hasImage ? (
                      <img src={hasImage} alt={p.name} />
                    ) : (
                      <ImageIcon size={64} style={{ color: 'var(--border-card)', opacity: 0.5 }} />
                    )}
                    <button className="card-upload-btn" onClick={() => triggerUpload(p.id)} title="Enviar imagem">
                      <Upload size={14} />
                    </button>
                  </div>
                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className={`card-tag ${isKit ? 'tag-kit' : 'tag-single'}`}>{isKit ? 'Kit' : 'Peça'}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: p.color || '#25f4f4', flexShrink: 0 }}></span>
                      {p.name}
                    </div>
                    <div className="card-price">R$ {displayPrice.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={12} /> {p.values?.weight || 0}g
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {p.values?.printTime || 0}h
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={12} /> {p.values?.filamentName || '—'}
                      </span>
                    </div>
                    
                    {qty > 0 ? (
                      <div className="card-stock stock-available">
                        <Check size={12} /> <span className="mono-num" style={{ fontWeight: 'bold' }}>{qty}</span> em estoque
                      </div>
                    ) : (
                      <div className="card-stock stock-out">
                        <X size={12} /> Sem estoque
                      </div>
                    )}
                    
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {priceDirect > 0 && (
                          <button 
                            className="add-cart-btn" 
                            disabled={qty <= 0} 
                            onClick={() => addToCart(p, 'direct')}
                            style={{ 
                              flex: '1 1 45%', padding: '8px 6px', fontSize: 11, 
                              background: addedEffect === `${p.id}_direct` ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)'
                            }}
                          >
                            {addedEffect === `${p.id}_direct` ? <Check size={14} /> : '💰 Direta'}
                          </button>
                        )}
                        {priceMarketplace > 0 && (
                          <button 
                            className="add-cart-btn" 
                            disabled={qty <= 0} 
                            onClick={() => addToCart(p, 'marketplace')}
                            style={{ 
                              flex: '1 1 100%', padding: '8px 6px', fontSize: 11,
                              background: addedEffect === `${p.id}_marketplace` ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #6366f1, #4f46e5)'
                            }}
                          >
                            {addedEffect === `${p.id}_marketplace` ? <Check size={14} /> : '🛒 Marketplace'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Floating Button */}
      <div className="cart-badge-float" onClick={() => setIsCartOpen(true)}>
        <ShoppingCart size={24} />
        {cartTotalItems > 0 && <span className="cart-badge-count">{cartTotalItems}</span>}
      </div>

      {/* Store Edit Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={(e) => e.target === e.currentTarget && setIsStoreModalOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={20} color="var(--accent-indigo)" /> Perfil da Loja
            </div>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label>Nome da Loja</label>
              <div className="input-wrapper">
                <input type="text" value={editStoreName} onChange={e => setEditStoreName(e.target.value)} maxLength={60} />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label>Nome do Vendedor</label>
              <div className="input-wrapper">
                <input type="text" value={editSellerName} onChange={e => setEditSellerName(e.target.value)} maxLength={60} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsStoreModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1500 }} onClick={() => setIsCartOpen(false)}></div>}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid var(--border-card)', flexShrink: 0, color: 'var(--text-primary)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={18} /> Carrinho</h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: 14 }}>
              <ShoppingCart size={48} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
              <div>Seu carrinho está vazio</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}_${item.channel}`} className="cart-item">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                    <span style={{ 
                      fontSize: 10, padding: '2px 6px', borderRadius: 4, marginRight: 6,
                      background: item.channel === 'marketplace' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)',
                      color: item.channel === 'marketplace' ? '#818cf8' : '#34d399'
                    }}>
                      {item.channel === 'marketplace' ? 'MKT' : 'DIRETA'}
                    </span>
                    {item.name}
                  </div>
                  <button onClick={() => removeCartItem(item.id, item.channel)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="qty-btn" onClick={() => changeCartQty(item.id, item.channel, -1)}><Minus size={14} /></button>
                    <input type="number" className="qty-value" value={item.qty} readOnly />
                    <button className="qty-btn" onClick={() => changeCartQty(item.id, item.channel, 1)}><Plus size={14} /></button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>R$ {item.price.toLocaleString('pt-BR', {minimumFractionDigits:2})} × {item.qty}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      R$ {(item.price * item.qty).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-card)', padding: 20, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Itens no carrinho</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cartTotalItems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingTop: 10, borderTop: '1px dashed var(--border-card)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, color: 'var(--accent-emerald)', lineHeight: 1 }}>
                R$ {cartTotalValue.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
              </span>
            </div>
            <button 
              onClick={handleOpenConfirm}
              className="btn btn-save"
              style={{
                width: '100%', padding: 14, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <CheckCircle size={18} /> Finalizar Venda
            </button>
          </div>
        )}
      </div>

      {/* Confirm Sale Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={(e) => e.target === e.currentTarget && setIsConfirmModalOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.1)', color: '#34d399', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShoppingCart size={32} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Confirmar Venda</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Revise os itens antes de finalizar</div>
            
            <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 20, textAlign: 'left', background: 'var(--bg-input)', padding: 12, borderRadius: 8, border: '1px solid var(--border-card)' }}>
              {cart.map(item => (
                <div key={`conf_${item.id}_${item.channel}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: 9, padding: '2px 4px', borderRadius: 3, background: item.channel === 'marketplace' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)', color: item.channel === 'marketplace' ? '#818cf8' : '#34d399' }}>
                      {item.channel === 'marketplace' ? 'MKT' : 'DIR'}
                    </span>
                    {item.name} ×{item.qty}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-emerald)' }}>
                    R$ {(item.price * item.qty).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 20 }}>
              <div className="input-group">
                <label style={{ fontSize: 11 }}>Canal de Venda / Marketplace</label>
                <div className="input-wrapper">
                  <select value={selectedMkt} onChange={handleMktChange}>
                    <option value="">-- Personalizado / Estimado --</option>
                    {marketplaces.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.fee_percentage !== undefined ? m.fee_percentage : m.commissionRate}%)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label style={{ fontSize: 11 }}>Custo de Frete (R$)</label>
                <div className="input-wrapper">
                  <input type="number" value={confirmShipping} onChange={e => setConfirmShipping(e.target.value)} min="0" step="0.01" />
                </div>
              </div>
              <div className="input-group">
                <label style={{ fontSize: 11 }}>Taxas da Plataforma / Extras (R$)</label>
                <div className="input-wrapper">
                  <input type="number" value={confirmTaxes} onChange={e => setConfirmTaxes(e.target.value)} min="0" step="0.01" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, paddingTop: 10, borderTop: '1px dashed var(--border-card)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Total ({cartTotalItems} itens)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, color: 'var(--accent-emerald)', lineHeight: 1 }}>
                R$ {cartTotalValue.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={() => setIsConfirmModalOpen(false)}>Cancelar</button>
              <button className="btn btn-save" style={{ flex: 1, padding: 12 }} onClick={handleConfirmSale}>✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

