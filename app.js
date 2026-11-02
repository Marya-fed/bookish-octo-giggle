/* === ИНВЕНТАРЬ С НАГРАДАМИ === */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 18px;
}
.inv-slot {
  background: #e2e8f0;
  border-radius: 12px;
  padding: 10px 4px;
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease;
  border: 2px dashed #cbd5e1;
}
.inv-slot.filled {
  background: #fff;
  opacity: 1;
  border: 2px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
  transform: translateY(-2px);
}
.inv-icon {
  font-size: 28px;
  margin-bottom: 4px;
  line-height: 1;
}
.inv-name {
  font-size: 10px;
  font-weight: 700;
  color: #5b6475;
  line-height: 1.2;
}
.inv-slot.filled .inv-name {
  color: #d97706;
}
