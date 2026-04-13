import React, { useState, useEffect } from 'react'
import { Select, Spin } from 'antd'
import { getAllCategories } from '../../api/category'

export default function CourseFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    categories: [],
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getAllCategories(1, 100);
      const categoryList = response.data?.pageList || [];
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCategoryChange = (selectedValues) => {
    setFilters(prev => ({
      ...prev,
      categories: selectedValues
    }));
  };

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const categoryOptions = categories.map(cat => ({
    label: cat.title,
    value: cat.title,
  }));

  return (
    <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-white px-4 py-3 bg-primary">Bộ lọc:</h3>
      <div className="space-y-6 p-4">
        <div>
          <h4 className="font-semibold mb-3 text-[#111418] dark:text-white">Danh mục</h4>
          {loadingCategories ? (
            <div className="flex justify-center py-4">
              <Spin size="small" />
            </div>
          ) : (
            <Select
              mode="multiple"
              placeholder="Chọn danh mục"
              options={categoryOptions}
              value={filters.categories}
              onChange={handleCategoryChange}
              style={{ width: '100%' }}
              className="w-full"
            />
          )}
        </div>

        <button
          onClick={handleApplyFilters}
          className="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}
