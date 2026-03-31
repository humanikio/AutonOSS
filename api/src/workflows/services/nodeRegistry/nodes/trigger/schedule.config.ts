/**
 * Schedule Trigger Node Configuration
 * Based on n8n's Schedule Trigger node: packages/nodes-base/nodes/ScheduleTrigger/
 */

import { INodeTypeDescription } from '../../types';

export const scheduleNode: INodeTypeDescription = {
  displayName: 'Schedule Trigger',
  name: 'scheduleTrigger',
  icon: 'fa:clock',
  group: ['trigger', 'schedule'],
  version: [1, 1.1, 1.2],
  defaultVersion: 1.2,
  description: 'Triggers the workflow at a specific time or interval',
  keywords: ['cron', 'timer', 'recurring', 'interval', 'daily', 'hourly', 'time', 'automated', 'periodic'],
  eventTriggerDescription: '',

  defaults: {
    name: 'Schedule Trigger',
    color: '#00FF00',
  },

  polling: true,

  inputs: [],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Trigger Times',
      name: 'rule',
      placeholder: 'Add Rule',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      description: 'The rules when to trigger',
      options: [
        {
          name: 'interval',
          displayName: 'Intervals',
          values: [
            {
              displayName: 'Interval',
              name: 'interval',
              type: 'options',
              options: [
                {
                  name: 'Days',
                  value: 'days',
                },
                {
                  name: 'Hours',
                  value: 'hours',
                },
                {
                  name: 'Minutes',
                  value: 'minutes',
                },
                {
                  name: 'Seconds',
                  value: 'seconds',
                },
              ],
              default: 'hours',
              description: 'The interval for the rule',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'number',
              typeOptions: {
                minValue: 1,
              },
              default: 1,
              description: 'The value of the interval',
            },
          ],
        },
        {
          name: 'cronExpression',
          displayName: 'Cron Expression',
          values: [
            {
              displayName: 'Expression',
              name: 'expression',
              type: 'string',
              default: '0 * * * *',
              placeholder: '0 * * * *',
              description: 'Use cron expression (e.g. "0 * * * *" for every hour)',
              hint: 'Format: minute hour day month weekday',
            },
          ],
        },
        {
          name: 'time',
          displayName: 'Specific Time',
          values: [
            {
              displayName: 'Hour',
              name: 'hour',
              type: 'number',
              typeOptions: {
                minValue: 0,
                maxValue: 23,
              },
              default: 14,
              description: 'The hour of the day to trigger (0-23)',
            },
            {
              displayName: 'Minute',
              name: 'minute',
              type: 'number',
              typeOptions: {
                minValue: 0,
                maxValue: 59,
              },
              default: 0,
              description: 'The minute of the hour to trigger (0-59)',
            },
            {
              displayName: 'Days of Week',
              name: 'daysOfWeek',
              type: 'multiOptions',
              options: [
                {
                  name: 'Monday',
                  value: 1,
                },
                {
                  name: 'Tuesday',
                  value: 2,
                },
                {
                  name: 'Wednesday',
                  value: 3,
                },
                {
                  name: 'Thursday',
                  value: 4,
                },
                {
                  name: 'Friday',
                  value: 5,
                },
                {
                  name: 'Saturday',
                  value: 6,
                },
                {
                  name: 'Sunday',
                  value: 0,
                },
              ],
              default: [1, 2, 3, 4, 5],
              description: 'The days of the week to trigger',
            },
          ],
        },
      ],
    },
  ],

  hints: [
    {
      message: 'Schedule Trigger requires the workflow to be activated to run on schedule',
      type: 'info',
      location: 'ndv',
    },
  ],
};
