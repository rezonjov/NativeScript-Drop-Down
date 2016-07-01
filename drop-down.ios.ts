/*! *****************************************************************************
Copyright (c) 2015 Tangra Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
***************************************************************************** */

import { TextField } from "ui/text-field";
import { ListPicker } from "ui/list-picker";
import * as dependencyObservable from "ui/core/dependency-observable";
import { Observable, PropertyChangeData } from "data/observable";
import * as common from "./drop-down-common";
import * as style from "ui/styling/style";
import * as utils from "utils/utils";
import { Font } from "ui/styling/font";

global.moduleMerge(common, exports);

const TOOLBAR_HEIGHT = 44;

export class DropDown extends common.DropDown {
    private _textField: TextField;
    private _toolbar: UIToolbar;
    private _flexToolbarSpace: UIBarButtonItem;
    private _doneButton: UIBarButtonItem;
    private _doneTapDelegate: TapHandler;
    private _accessoryViewVisible: boolean;
    public _listPicker: ListPicker;

    constructor() {
        super();

        let applicationFrame = UIScreen.mainScreen().applicationFrame;

        this._textField = new TextField();
        this._listPicker = new ListPicker();

        (this._listPicker as any)._delegate = DropDownListPickerDelegateImpl.initWithOwner(this);        
        this._flexToolbarSpace = UIBarButtonItem.alloc().initWithBarButtonSystemItemTargetAction(UIBarButtonSystemItem.UIBarButtonSystemItemFlexibleSpace, null, null);
        this._doneTapDelegate = TapHandler.initWithOwner(new WeakRef(this));
        this._doneButton = UIBarButtonItem.alloc().initWithBarButtonSystemItemTargetAction(UIBarButtonSystemItem.UIBarButtonSystemItemDone, this._doneTapDelegate, "tap");

        this._accessoryViewVisible = true;
        this._toolbar = UIToolbar.alloc().initWithFrame(CGRectMake(0, 0, applicationFrame.size.width, TOOLBAR_HEIGHT));
        this._toolbar.autoresizingMask = UIViewAutoresizing.UIViewAutoresizingFlexibleWidth;

        let nsArray = NSMutableArray.alloc().init();
        nsArray.addObject(this._flexToolbarSpace);
        nsArray.addObject(this._doneButton);
        this._toolbar.setItemsAnimated(nsArray, false);
    }

    get ios(): UITextField {
        return this._textField.ios;
    }

    get accessoryViewVisible(): boolean {
        return this._accessoryViewVisible;
    }
    set accessoryViewVisible(value: boolean) {
        this._accessoryViewVisible = value;
        this._showHideAccessoryView();
    }

    private _showHideAccessoryView() {
        this.ios.inputAccessoryView = (this._accessoryViewVisible ? this._toolbar : null);
    }

    public onLoaded() {
        super.onLoaded();

        this._textField.onLoaded();
        this._listPicker.onLoaded();
        this._listPicker.on(Observable.propertyChangeEvent,
            (data: PropertyChangeData) => {
                if (data.propertyName === "selectedIndex") {
                    this.selectedIndex = data.value;
                }
            });
        this.ios.inputView = this._listPicker.ios;
        this._showHideAccessoryView();
    }

    public onUnloaded() {
        this.ios.inputView = null;
        this.ios.inputAccessoryView = null;

        this._listPicker.off(Observable.propertyChangeEvent);

        this._textField.onUnloaded();
        this._listPicker.onUnloaded();

        super.onUnloaded();
    }

    public _onItemsPropertyChanged(data: dependencyObservable.PropertyChangeData) {
        this._listPicker.items = data.newValue;
    }

    public _onSelectedIndexPropertyChanged(data: dependencyObservable.PropertyChangeData) {
        super._onSelectedIndexPropertyChanged(data);
        this._listPicker.selectedIndex = data.newValue;
        this._textField.text = (this.items && this.items.getItem ? this.items.getItem(data.newValue) : this.items[data.newValue]);
    }
}

class TapHandler extends NSObject {
    public static ObjCExposedMethods = {
        "tap": { returns: interop.types.void, params: [] }
    };

    private _owner: WeakRef<DropDown>;

    public static initWithOwner(owner: WeakRef<DropDown>) {
        let tapHandler = <TapHandler>TapHandler.new();
        tapHandler._owner = owner;

        return tapHandler;
    }

    public tap() {
        this._owner.get().ios.resignFirstResponder();
    }
}

class DropDownListPickerDelegateImpl extends NSObject implements UIPickerViewDelegate {
    public static ObjCProtocols = [UIPickerViewDelegate];

    private _owner: WeakRef<DropDown>;
    
    public static initWithOwner(owner: DropDown): DropDownListPickerDelegateImpl {
        let delegate = <DropDownListPickerDelegateImpl>DropDownListPickerDelegateImpl.new();
        delegate._owner = new WeakRef(owner);
        return delegate;
    }

    private _getStringAttributesFromStyle(): NSDictionary {
        let result = NSMutableDictionary.alloc().init();
        let owner = this._owner.get();

        if (!owner || !owner.style) {
            return result;
        }

        if (owner.style.color) {
            result.setValueForKey(owner.style.color.ios, NSForegroundColorAttributeName);
        }        

        return result;
    }

    public pickerViewAttributedTitleForRowForComponent(pickerView: UIPickerView, row: number, component: number): NSAttributedString {
        let owner = this._owner.get();
        let text: string = row.toString();

        if (owner) {
            text = (owner._listPicker as any)._getItemAsString(row);
        }

        return NSAttributedString.alloc().initWithStringAttributes(text, this._getStringAttributesFromStyle());
    }

    public pickerViewDidSelectRowInComponent(pickerView: UIPickerView, row: number, component: number): void {
        let owner = this._owner.get();
        if (owner) {
            owner._listPicker._onPropertyChangedFromNative(ListPicker.selectedIndexProperty, row);
        }
    }
}

//#region Styling
export class DropDownStyler implements style.Styler {
    //#region Font
    private static setFontInternalProperty(dropDown: DropDown, newValue: any, nativeValue?: any) {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        ios.font = (<Font>newValue).getUIFont(nativeValue);
    }

    private static resetFontInternalProperty(dropDown: DropDown, nativeValue: any) {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        ios.font = nativeValue;
    }

    private static getNativeFontInternalValue(dropDown: DropDown): any {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        return ios.font;
    }
    //#endregion

    //#region Text Align Prperty
    private static setTextAlignmentProperty(dropDown: DropDown, newValue: any) {
        utils.ios.setTextAlignment(dropDown._nativeView, newValue);
    }

    private static resetTextAlignmentProperty(dropDown: DropDown, nativeValue: any) {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        ios.textAlignment = nativeValue;
    }

    private static getNativeTextAlignmentValue(dropDown: DropDown): any {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        return ios.textAlignment;
    }
    //#endregion

    //#region Color Prperty
    private static setColorProperty(dropDown: DropDown, newValue: any) {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        let pickerView = <UIPickerView>dropDown._listPicker.ios;

        ios.textColor = newValue;
        pickerView.reloadAllComponents();
    }

    private static resetColorProperty(dropDown: DropDown, nativeValue: any) {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        let pickerView = <UIPickerView>dropDown._listPicker.ios;

        ios.textColor = nativeValue;
        pickerView.reloadAllComponents();
    }

    private static getNativeColorValue(dropDown: DropDown): any {
        let ios = <utils.ios.TextUIView>dropDown._nativeView;
        return ios.textColor;
    }
    //#endregion

    //#region Background Color Prperty
    private static setBackgroundColorProperty(dropDown: DropDown, newValue: any) {
        let ios = <UITextView>dropDown._nativeView;
        let pickerView = <UIPickerView>dropDown._listPicker.ios;
        
        ios.backgroundColor = newValue;
        pickerView.backgroundColor = newValue;
    }

    private static resetBackgroundColorProperty(dropDown: DropDown, nativeValue: any) {
        let ios = <UITextView>dropDown._nativeView;
        let pickerView = <UIPickerView>dropDown._listPicker.ios;

        ios.backgroundColor = nativeValue;
        pickerView.backgroundColor = nativeValue;
    }

    private static getNativeBackgroundColorValue(dropDown: DropDown): any {
        let ios = <UITextView>dropDown._nativeView;
        return ios.backgroundColor;
    }
    //#endregion

    public static registerHandlers() {
        style.registerHandler(style.fontInternalProperty,
            new style.StylePropertyChangedHandler(
                DropDownStyler.setFontInternalProperty,
                DropDownStyler.resetFontInternalProperty,
                DropDownStyler.getNativeFontInternalValue
            ),
            "DropDown");
        
        style.registerHandler(style.textAlignmentProperty,
            new style.StylePropertyChangedHandler(
                DropDownStyler.setTextAlignmentProperty,
                DropDownStyler.resetTextAlignmentProperty,
                DropDownStyler.getNativeTextAlignmentValue
            ),
            "DropDown");
        
        style.registerHandler(style.colorProperty,
            new style.StylePropertyChangedHandler(
                DropDownStyler.setColorProperty,
                DropDownStyler.resetColorProperty,
                DropDownStyler.getNativeColorValue
            ),
            "DropDown");
        
        style.registerHandler(style.backgroundColorProperty,
            new style.StylePropertyChangedHandler(
                DropDownStyler.setBackgroundColorProperty,
                DropDownStyler.resetBackgroundColorProperty,
                DropDownStyler.getNativeBackgroundColorValue
            ),
            "DropDown");
    }
}
DropDownStyler.registerHandlers();
//#endregion