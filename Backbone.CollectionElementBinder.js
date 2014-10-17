;(function(root) {
    // Save in scope: Backbone, Backbone.ModelBinder, 
    if (!root.Backbone) {
        throw 'Please include Backbone.js before Backbone.CollectionElementBinder.js';
    }
    if (!root.Backbone.ModelBinder) {
        throw 'Please include Backbone.ModelBinder.js before Backbone.CollectionElementBinder.js';
    }
    var Backbone = root.Backbone;
    var _ = root._;
    
    var $ = root.jQuery || root.Zepto || root.ender;
    if (!$) {
        throw 'Please include jQuery, Zepto, Ender before Backbone.CollectionElementBinder.js';
    }
    
    /**
     * Backbone collection element binder
     * 
     * @class
     * @constructor
     * @returns Void
     */
    Backbone.CollectionElementBinder = function(){};
    Backbone.CollectionElementBinder.VERSION = '0.1.0';
    _.extend(Backbone.CollectionElementBinder.prototype, Backbone.Events, {
        /**
         * Collection
         * 
         * @type Backbone.Collection
         */
        _collection: null,
        
        /**
         * List HTML element
         * 
         * @type jQuery
         */
        _listEl: null,
        
        /**
         * Model prototype element
         * 
         * @type jQuery
         */
        _modelPrototypeEl: null,
        
        /**
         * Bindings for each collection model
         * 
         * @type Object
         */
        _modelBindings: null,
        
        /**
         * Disable "add", "remove" collection render
         * 
         * @type Boolean
         */
        _onlyResetBind: false,
        
        /**
         * Model binders
         * 
         * @type Array
         */
        _modelBinders: null,
        
        /**
         * HTML element list for model binding
         * 
         * @type Array
         */
        _modelHtmlElements: null,
        
        /**
         * Bind collection
         * Unbind if bind exists
         * 
         * @param Backbone.Collection collection
         * @param HTMLElement|jQuery listEl
         * @param HTMLElement|jQuery prototypeEl
         * @param Object modelBindings
         * @param Boolean onlyResetBind Default "false"
         * @returns Void
         */
        bind: function(collection, listEl, prototypeEl, modelBindings, onlyResetBind) {
            this.unbind();
            
            // Defaults
            this._modelHtmlElements = [];
            this._modelBinders = [];
            
            // Options
            this._collection = collection;
            this._listEl = $(listEl);
            this._modelPrototypeEl = $(prototypeEl);
            this._modelBindings = modelBindings;
            this._onlyResetBind = onlyResetBind;
            
            // Options check
            if (!this._collection) throw 'Collection must be specified';
            if (_.isEmpty(this._listEl)) throw 'List HTML element must be specified';
            if (this._listEl.length > 1) throw 'Invalid list HTML element. Element count: ' + this._listEl.length;
            if (_.isEmpty(this._modelPrototypeEl)) throw 'Model HTML prototype must be specified';
            if (this._modelPrototypeEl.length > 1) throw 'Invalid model HTML prototype. Element count: ' + this._modelPrototypeEl.length;
            if (_.isEmpty(this._modelBindings)) throw 'Model bindings must be specified';
            
            // Prepare prototype
            $(this._modelPrototypeEl).hide();
            
            this._bindCollectionToView();
        },
        
        /**
         * Bind collection to view
         * 
         * @returns Void
         */
        _bindCollectionToView: function() {
            this._collection.collectionBinder = this;
            
            this._collection.on('reset', this._onCollectionReset, this);
            if (!this._onlyResetBind) {
                this._collection.on('add', this._onCollectionAdd, this);
                this._collection.on('remove', this._onCollectionRemove, this);
            }

            this._onCollectionReset();
        },
        
        /**
         * Unbind collection
         * 
         * @returns Void
         */
        unbind: function() {
            this._unbindCollectionToView();
            
            this._collection = null;
            this._listEl = null;
            this._modelBindings = null;
            this._onlyResetBind = false;
            this._modelBinders = null;
            this._modelHtmlElements = null;
        },
        
        /**
         * Unbind collection to view
         * 
         * @returns Void
         */
        _unbindCollectionToView: function() {
            if(this._collection) {
                this._collection.off('reset', this._onCollectionReset, this);
                this._collection.off('add', this._onCollectionAdd, this);
                this._collection.off('remove', this._onCollectionRemove, this);
                if (this._collection.collectionBinder) {
                    delete this._collection.collectionBinder;
                }
                this._collection = null;
            }
            
            this._hideModelHtmlElement(this._modelHtmlElements);
            $(this._modelHtmlElements).remove();
        },
        
        /**
         * Collection "reset" event handler
         * 
         * @returns Void
         */
        _onCollectionReset: function() {
            if (this._collection.length == 0) {
                this._unbindAllModels();
            }
            
            // Bind models
            this._collection.each(function(model, i) {
                this._bindModel(model, i);
            }, this);
            
            var unbindStartIndex = this._collection.length;
            var bindersCount = this._modelBinders.length;
            for (var i = unbindStartIndex; i < bindersCount; i++) {
                this._unbindModel(i, true);
            }
            
            this.trigger('reset', this._collection.models);
        },
        
        /**
         * Collection "add" event handler
         * 
         * @param Backbone.Model model
         * @param Backbone.Collection collection
         * @param Object options
         * @returns Void
         */
        _onCollectionAdd: function(model, collection, options) {
            this._bindModel(model, options.index);
            this.trigger('add', model);
        },
        
        /**
         * Collection "remove" event handler
         * 
         * @param Backbone.Model model
         * @param Backbone.Collection collection
         * @param Object options
         * @returns Void
         */
        _onCollectionRemove: function(model, collection, options) {
            this._unbindModel(options.index);
            this.trigger('remove', model);
        },
        
        /**
         * Bind model
         * 
         * @param Backbone.Model model
         * @param Number index
         * @returns Void
         */
        _bindModel: function(model, index) {
            var htmlElement = this._getModelHtmlElement(index);
            
            this._getModelBinder(index).bind(model, htmlElement, this._modelBindings);
            this._showModelHtmlElement(htmlElement);
        },
        
        /**
         * Unbind model
         * 
         * @param Number index
         * @param Boolean dontMoveElement
         * @returns Void
         */
        _unbindModel: function(index, dontMoveElement) {
            this._getModelBinder(index).unbind();
            
            var htmlElement = this._getModelHtmlElement(index);
            
            this._hideModelHtmlElement(htmlElement);
            if (!dontMoveElement) {
                $(htmlElement).detach().appendTo(this._listEl);
                this._recalcElementIndexes(index);
            }
        },
        
        /**
         * Recalc element indexes
         * 
         * @param Number startIndex
         * @returns Void
         */
        _recalcElementIndexes: function(startIndex) {
            startIndex = startIndex || 0;
            
            // Update element position
            this._modelHtmlElements = this._getAppendedModelHtmlElements();
            
            // Recalc data attributes
            var newIndex = startIndex;
            _.each(this._modelHtmlElements, function(el, i) {
                var currentIndex = parseInt($(el).attr('data-ceb-index'));
                if (currentIndex < startIndex) {
                    return;
                }
                
                $(el).attr('data-ceb-index', newIndex);
                
                newIndex++;
            });
        },
        
        /**
         * Get appended model HTML elements
         * 
         * @returns Array
         */
        _getAppendedModelHtmlElements: function() {
            return this._listEl.children().not(this._modelPrototypeEl).toArray();
        },
        
        /**
         * Unbind all models
         * 
         * @returns Void
         */
        _unbindAllModels: function() {
            _.each(this._modelBinders, function(binder, i) {
                this._unbindModel(i);
            }, this);
        },
        
        /**
         * Get model binder
         * 
         * @param Number index
         * @returns Backbone.ModelBinder
         */
        _getModelBinder: function(index) {
            if (!this._modelBinders[index]) {
                this._modelBinders[index] = new Backbone.ModelBinder();
            }
            
            return this._modelBinders[index];
        },
        
        /**
         * Get model HTML element
         * 
         * @param Number index
         * @returns HTMLElement
         */
        _getModelHtmlElement: function(index) {
            if (!this._modelHtmlElements[index]) {
                var appendedElements = this._getAppendedModelHtmlElements();
                
                // Clone html prototype
                var element = $(this._modelPrototypeEl).clone();
                element.attr('data-ceb-index', index);
                
                // Get previous index element
                var previousIndexElement = $(appendedElements).filter('[data-ceb-index=' + (index-1) + ']');
                
                // Append new element
                if (previousIndexElement.length) {
                    previousIndexElement.after(element);
                } else {
                    this._listEl.append(element);
                }
                
                // Append new element
                this._modelHtmlElements[index] = element.get(0);
            }

            return this._modelHtmlElements[index];
        },
        
        /**
         * Show model HTML element
         * 
         * @param HTMLElement|Array element
         * @returns Void
         */
        _showModelHtmlElement: function(element) {
            $(element).show();
        },
        
        /**
         * Hide model HTML element
         * 
         * @param HTMLElement|Array element
         * @returns Void
         */
        _hideModelHtmlElement: function(element) {
            $(element).hide();
        },
        
        /**
         * Sort element by index data attribute
         * 
         * Attribute: data-ceb-index
         * 
         * @param Array elements
         * @returns Array
         */
        _sortByIndex: function(elements) {
            var sortedElements = elements.slice();
            _.each(elements, function(el, i) {
                if ($(sortedElements[i]).attr('data-ceb-index') < $(sortedElements[i-1]).attr('data-ceb-index')) {
                    var buffer = sortedElements[i];
                    sortedElements[i] = sortedElements[i-1];
                    sortedElements[i-1] = buffer;
                }
            });
            
            return sortedElements;
        },
        
        /**
         * Get model HTML element
         * 
         * @param Backbone.Model model
         * @returns HTMLElement
         */
        getModelHtmlElement: function(model) {
            var index = this._collection.indexOf(model);
            if (index == -1) {
                throw 'Model is not in the collection';
            }
            
            return this._modelHtmlElements[index];
        }
    });
})(this);
