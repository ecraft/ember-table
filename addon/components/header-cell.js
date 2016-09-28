import Ember from 'ember';
import StyleBindingsMixin from 'ember-table/mixins/style-bindings';
import RegisterTableComponentMixin from 'ember-table/mixins/register-table-component';

export default Ember.Component.extend(
StyleBindingsMixin, RegisterTableComponentMixin, {
  // ---------------------------------------------------------------------------
  // API - Inputs
  // ---------------------------------------------------------------------------

  // TODO: Doc
  classNames: ['ember-table-cell', 'ember-table-header-cell'],
  classNameBindings: ['column.isSortable:sortable', 'column.textAlign'],
  styleBindings: ['width', 'height'],

  // ---------------------------------------------------------------------------
  // Internal properties
  // ---------------------------------------------------------------------------

  column: Ember.computed.alias('content'),
  width: Ember.computed.alias('column.width'),
  minWidth: Ember.computed.alias('column.minWidth'),
  maxWidth: Ember.computed.alias('column.maxWidth'),
  nextResizableColumn: Ember.computed.alias('column.nextResizableColumn'),

  headerHeight: null,
  height: Ember.computed.alias('headerHeight'),
  columnMode: null,
  columnsFillTable: null,

  effectiveMinWidth: Ember.computed(function() {
    if (this.get('columnMode') === 'standard') {
      return this.get('minWidth');
    }
    var nextColumnMaxDiff = this.get('nextResizableColumn.maxWidth') -
        this.get('nextResizableColumn.width');
    if (this.get('minWidth') && nextColumnMaxDiff) {
      return Math.min(this.get('minWidth'), this.get('width') -
          nextColumnMaxDiff);
    } else if (this.get('minWidth')) {
      return this.get('minWidth');
    } else {
      return this.get('width') - nextColumnMaxDiff;
    }
  }).property('width', 'minWidth', 'columnMode',
      'nextResizableColumn.{width,maxWidth}'),

  effectiveMaxWidth: Ember.computed(function() {
    if (this.get('columnMode') === 'standard') {
      return this.get('maxWidth');
    }
    var nextColumnMaxDiff = this.get('nextResizableColumn.width') -
        this.get('nextResizableColumn.minWidth');
    if (this.get('maxWidth') && !Ember.isNone(nextColumnMaxDiff)) {
      return Math.min(this.get('maxWidth'), this.get('width') +
          nextColumnMaxDiff);
    } else if (this.get('maxWidth')) {
      return this.get('maxWidth');
    } else {
      return this.get('width') + nextColumnMaxDiff;
    }
  }).property('width', 'minWidth', 'columnMode',
      'nextResizableColumn.{width,minWidth}'),

  // jQuery UI resizable option
  resizableOption: Ember.computed(function() {
    return {
      handles: 'e', // Show the "east"/"right" handle
      // We need about 10px as absolute minimums for the columns
      minWidth: Math.max(this.get('effectiveMinWidth') || 0, 10),
      maxWidth: this.get('effectiveMaxWidth'),
      // TODO(azirbel): This is unexpected and needs documentation or removal
      grid: this.get('column.snapGrid'),
      resize: Ember.$.proxy(this.onColumnResize, this),
      stop: Ember.$.proxy(this.onColumnResize, this)
    };
  }).property('effectiveMinWidth', 'effectiveMaxWidth'),

  didRender: function() {
    Ember.run.scheduleOnce('afterRender', this, 'didRenderCalculations');
  },
  didRenderCalculations: function() {
    this.elementSizeDidChange();
    this.recomputeResizableHandle();
  },

  willDestroyElement: function() {
    if (this.$().is('.ui-resizable')) {
      this.$().resizable('destroy');
    }

    Ember.run.cancel(this._scheduledElementSizeDidChange);

    this._super();
  },

  _isResizable: Ember.computed(function() {
    if (this.get('columnMode') === 'standard') {
      return this.get('column.isResizable');
    } else {
      return this.get('column.isResizable') && this.get('nextResizableColumn');
    }
  }).property('column.isResizable', 'columnMode',
      'nextResizableColumn'),

  // `event` here is a jQuery event
  onColumnResize: function(event, ui) {
    var newWidth = Math.round(ui.size.width);
    if (this.get('columnMode') === 'standard') {
      this.get('column').resize(newWidth);
      this.set('columnsFillTable', false);
    } else {
      var diff = this.get('width') - newWidth;
      this.get('column').resize(newWidth);
      this.get('nextResizableColumn').resize(
          this.get('nextResizableColumn.width') + diff);
    }

    this.elementSizeDidChange();

    // Trigger the table resize (and redraw of layout) when resizing is done
    if (event.type === 'resizestop') {
      this.get('tableComponent').elementSizeDidChange();
    }

    this.get('context').sendAction('onColumnResized', this.get('column'), newWidth);
  },

  /**
   * A Ember timer object representing a scheduled call to
   * `elementSizeDidChange`.
   * @private
   * @type {Object}
   */
  _scheduledElementSizeDidChange: null,

  elementSizeDidChange: function() {
    var maxHeight = 0;
    // TODO(Louis): This seems bad...
    Ember.$('.ember-table-header-block .ember-table-content').each(function() {
      var thisHeight = Ember.$(this).outerHeight();
      if (thisHeight > maxHeight) {
        maxHeight = thisHeight;
      }
    });

    this.set('tableComponent._contentHeaderHeight', maxHeight);
  },

  cellWidthDidChange: Ember.observer('width', function() {
    this._scheduledElementSizeDidChange = Ember.run.scheduleOnce('afterRender',
      this, this.elementSizeDidChange);
  }),

  resizableObserver: Ember.observer('resizableOption', 'column.isResizable', 'columnMode',
      'nextResizableColumn', function() {
    this.recomputeResizableHandle();
  }),

  recomputeResizableHandle: function() {
    if (this.get('_isResizable')) {
      this.$().resizable(this.get('resizableOption'));
    } else {
      if (this.$().is('.ui-resizable')) {
        this.$().resizable('destroy');
      }
    }
  },

  actions: {
    toggleTableCollapse: function() {
      this.sendAction('toggleTableCollapse');
    },
    sortByColumn: function() {
      this.sendAction('sortByColumn', this.get('column'));
  },
  }
});
