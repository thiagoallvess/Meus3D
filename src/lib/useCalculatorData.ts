"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useAuth } from "@/context/AuthContext";

export type Machine = { id: string; name: string; power_watts: number; value: number; life_hours: number; maintenance_cost_year: number; };
export type Filament = { id: string; name: string; cost_kg: number; empty_spool_weight: number; brand: string; };
export type Auxiliary = { id: string; name: string; cost: number; unit: string; unit_size: number; };
export type Packaging = { id: string; name: string; cost: number; unit: string; unit_size: number; };
export type Marketplace = { id: string; name: string; fee_percentage: number; fixed_fee: number; free_shipping_cost: number; };

export function useCalculatorData() {
  const { user } = useAuth();
  
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [auxiliaries, setAuxiliaries] = useState<Auxiliary[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchData() {
      setLoading(true);
      
      const [
        { data: mac }, 
        { data: fil },
        { data: aux },
        { data: pkg },
        { data: mkt }
      ] = await Promise.all([
        supabase.from('machines').select('*').order('name'),
        supabase.from('filaments').select('*').order('color_name'),
        supabase.from('auxiliaries').select('*').order('name'),
        supabase.from('packaging').select('*').order('name'),
        supabase.from('marketplaces').select('*').order('name')
      ]);

      if (mac) {
        setMachines(mac.map(m => ({
          id: m.id,
          name: m.name,
          power_watts: m.power_watts,
          value: m.purchase_price,
          life_hours: 0,
          maintenance_cost_year: 0
        })));
      }
      
      if (fil) {
        setFilaments(fil.map(f => ({
          id: f.id,
          name: `${f.material} ${f.color_name}`,
          cost_kg: f.price / (f.weight / 1000), // convert price per spool to price per kg
          empty_spool_weight: 200,
          brand: f.brand
        })));
      }
      
      if (aux) {
        setAuxiliaries(aux.map(a => ({
          id: a.id,
          name: a.name,
          cost: a.unit_cost,
          unit: 'un',
          unit_size: 1
        })));
      }
      
      if (pkg) setPackaging(pkg as any[]);
      
      if (mkt) {
        setMarketplaces(mkt.map(m => ({
          id: m.id,
          name: m.name,
          fee_percentage: m.commission_rate,
          fixed_fee: m.fixed_fee || 0,
          free_shipping_cost: m.free_shipping_min || 0
        })));
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  return { machines, filaments, auxiliaries, packaging, marketplaces, loading };
}
