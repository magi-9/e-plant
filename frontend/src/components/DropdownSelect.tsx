import { Fragment, type ReactNode } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface DropdownSelectOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
}

interface DropdownSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownSelectOption[];
    placeholder: ReactNode;
    neutralValues?: string[];
    wrapperClassName?: string;
    buttonClassName?: string;
    panelClassName?: string;
}

export default function DropdownSelect({
    value,
    onChange,
    options,
    placeholder,
    neutralValues = [],
    wrapperClassName = 'w-full',
    buttonClassName = '',
    panelClassName = '',
}: DropdownSelectProps) {
    const selectedOption = options.find((option) => option.value === value) ?? null;
    const isActive = value !== '' && !neutralValues.includes(value);

    return (
        <Listbox value={value} onChange={onChange}>
            {({ open }) => (
                <div className={`relative ${wrapperClassName}`}>
                    <Listbox.Button
                        className={`inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border px-3 text-sm font-medium transition-all focus:outline-none ${isActive ? 'bg-[#eaf4fe] border-[rgba(33,150,243,0.25)] text-[#2196f3]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'} ${buttonClassName}`}
                    >
                        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                        <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </Listbox.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-120"
                        enterFrom="opacity-0 scale-95 translate-y-1"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-90"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-1"
                    >
                        <Listbox.Options className={`absolute left-0 top-full z-40 mt-2 max-h-72 min-w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_20px_45px_rgba(15,23,42,0.12)] focus:outline-none ${panelClassName}`}>
                            {options.map((option) => (
                                <Listbox.Option key={option.value} value={option.value} disabled={option.disabled} as={Fragment}>
                                    {({ active, selected, disabled }) => (
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${active || selected ? 'bg-[#eaf4fe] text-[#2196f3]' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span className="min-w-0 truncate font-medium">{option.label}</span>
                                        </button>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            )}
        </Listbox>
    );
}